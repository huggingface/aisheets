# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "datasets~=4.0.0",
#     "huggingface-hub[hf_transfer]",
#     "rich",
#     "typer",
#     "vllm~=0.10.0",
#     "transformers==4.53.2",
#     "flashinfer-python",
#     "torch",
# ]
# ///
import dataclasses
import multiprocessing
from collections import defaultdict
from typing import Tuple

import requests
import typer
import yaml
from datasets import load_dataset, Value, Features, Dataset
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel
from vllm import LLM, SamplingParams
import torch


@dataclasses.dataclass
class ProcessorConfig:
    """
    Configuration for the dataset processor.

    Attributes:
        source_columns (set[str]): Set of source column names.
        columns (dict[str, dict]): Mapping of generated column names to their configurations.
        reverse_graph (dict[str, list[str]]): Reverse dependency graph mapping each node to its dependencies.
        max_workers (int): Maximum number of worker threads to use.
        num_rows (int): Number of rows to generate.
    """
    source_columns: set[str]
    columns: dict[str, dict]
    graph: dict[str, list[str]]
    reverse_graph: dict[str, list[str]]
    max_workers: int | None = None
    batch_size: int | None = None
    num_rows: int | None = None
    vllm_model: str | None = None

    @property
    def sorted_columns(self) -> list[str]:
        """Return a sorted list of generated column names."""
        columns = []

        idx = 0
        while len(columns) < len(self.columns):
            column, parents = list(self.reverse_graph.items())[idx]
            if all(p in self.source_columns for p in parents) and column not in columns:
                columns.append(column)
                idx = 0
            elif all(p in self.source_columns or p in columns for p in parents) and column not in columns:
                columns.append(column)
                idx = 0
            else:
                idx += 1

        return columns


def load_processor_config(
    *,
    config_path: str,
    dataset: Dataset,
    max_workers: int | None = None,
    num_rows: int | None = None,
    batch_size: int | None = 1000,
    vllm_model: str | None = None,
) -> ProcessorConfig:

    with Console().status("[bold green]Loading configuration..."):
        config = _load_config(config_path)
        source_columns = set(dataset.features.keys())

        # Validate no overlap between source and generated columns
        columns = config.get('columns', {})
        columns_to_generate = set(columns.keys())
        if overlap := (source_columns & columns_to_generate):
            raise ValueError(f"Columns defined in both source dataset and generation config: {overlap}")

        graph, reverse_graph = _build_dependency_graph(source_columns, columns)

        processor_config = ProcessorConfig(
            source_columns=source_columns,
            columns=columns,
            reverse_graph=reverse_graph,
            graph=graph,
            max_workers=max_workers,
            num_rows=num_rows,
            batch_size=batch_size,
            vllm_model=vllm_model,
        )

        _display_configuration_summary(processor_config)

        return processor_config


def _display_configuration_summary(
    config: ProcessorConfig
) -> None:
    summary = [
        f"[bold green]Pipeline Configuration Summary[/]",
        f"• Source columns: [cyan]{len(config.source_columns)}[/]",
        f"• Generated columns: [cyan]{len(config.columns)}[/]",
        f"• Worker threads: [cyan]{config.max_workers}[/]",
        f"• Rows to generate: [cyan]{config.num_rows}[/]",
        f"• VLLM model: [cyan]{config.vllm_model}[/]",
        f"• Batch size: [cyan]{config.batch_size}[/]",
    ]

    if config.source_columns:
        summary.append("\n[bold blue]Source Dataset:[/]")
        for col in sorted(config.source_columns):
            summary.append(f"• [cyan]{col}[/]")

    if config.columns:
        summary.append("\n[bold blue]Node Dependencies:[/]")
        # Add dependency information for each node
        for node in config.columns:
            deps = config.reverse_graph[node]
            if deps:
                summary.append(f"• [cyan]{node}[/] ← {', '.join(deps)}")
            else:
                summary.append(f"• [cyan]{node}[/] (root node)")

    rprint(Panel("\n".join(summary)))


def _build_dependency_graph(
    source_columns: set[str],
    columns: dict[str, dict]
) -> Tuple[dict[str, list], dict[str, list]]:
    """Build directed dependency graph from configuration."""
    graph = defaultdict(list)
    reverse_graph = defaultdict(list)

    all_nodes = set()
    dependent_nodes = set()

    # Add source columns as potential dependencies
    all_nodes.update(source_columns)

    for col, config in columns.items():
        all_nodes.add(col)
        if deps := config.get('columnsReferences'):
            # Validate dependencies exist in either source or generated columns
            invalid_deps = set(deps) - (source_columns | set(columns.keys()))
            if invalid_deps:
                raise ValueError(f"Invalid dependencies for {col}: {invalid_deps}")

            for dep in deps:
                graph[dep].append(col)
                reverse_graph[col].append(dep)

                # Only mark as dependent if it depends on non-source columns
                if dep not in source_columns:
                    dependent_nodes.add(col)

    # A node is a root if it:
    # 1. Is not a source column AND
    # 2. Either has no dependencies OR only depends on source columns
    root_nodes = [
        node for node in columns.keys()
        if node not in dependent_nodes
    ]

    if not root_nodes and columns:
        raise ValueError("No root nodes found! Circular dependencies may exist.")

    return graph, reverse_graph


def _load_config(path: str) -> dict:
    """
    Load a configuration file from a local path or a URL.

    :param path: The path to the configuration file, which can be a local file or a URL.
    :return:
        A dictionary containing the configuration loaded from the file.
    """
    if path.startswith(('http://', 'https://')):
        response = requests.get(
            path,
            headers={'Accept': 'application/x-yaml; application/json'}
        )
        response.raise_for_status()
        return yaml.safe_load(response.text)

    with open(path) as f:
        return yaml.safe_load(f)


def process_column(
    *,
    dataset: Dataset,
    llm: LLM,
    processor_config: ProcessorConfig,
    column_name: str
) -> Dataset:
    column_config = processor_config.columns[column_name]

    def prepare_prompt(prompt: str, row: dict) -> str:
        """Prepare prompt template by filling in values from row."""
        for key, value in row.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in prompt:
                prompt = prompt.replace(placeholder, str(value))

        return prompt

    def map_function(batch: dict):
        prompt_template = column_config["prompt"]

        sampling_params = SamplingParams(
            temperature=0.7,
            top_p=0.9,
            max_tokens=2048,  # Adjust max tokens as needed
        )

        batch_messages = []
        rows = [dict(zip(batch.keys(), values)) for values in zip(*batch.values())]
        for row in rows:
            prompt = prepare_prompt(prompt_template, row)
            messages = [{"role": "user", "content": prompt}]
            batch_messages.append(messages)

        # Process the batch of messages
        outputs = llm.chat(batch_messages, sampling_params=sampling_params)

        results = []
        for output in outputs:
            # Get the result for each row
            result = output.outputs[0].text.strip()
            results.append(result)

        return {column_name: results}

    return dataset.map(
        map_function,
        batched=True,
        batch_size=processor_config.batch_size,  # Adjust batch size as needed
        features=Features({
            **dataset.features,
            column_name: Value(column_config.get("dtype", "string")),  # Ensure the new column is of type string
        }),
    )


def check_cuda_availability():
    """Check if CUDA is available and exit if not."""
    if not torch.cuda.is_available():
        rprint(f"[bold red]CUDA is not available![/]")
        raise RuntimeError("CUDA is not available")
    else:
        rprint("[bold green]CUDA is available![/]")


def main(
    *,
    repo_id: str,
    destination: str,
    config: str = './config.yml',
    split: str = "train",
    destination_split: str = "train",
    create_pr: bool = False,
    num_rows: int | None = None,
    vllm_model: str | None = None,
    max_workers: int | None = None,
    batch_size: int | None = 512,
):
    check_cuda_availability()

    if vllm_model is None:
        vllm_model = "meta-llama/Llama-3.1-8B-Instruct"
        rprint(f"[bold orange]Using default VLLM model: {vllm_model}[/]")

    llm = LLM(
        model=vllm_model,
        trust_remote_code=True,
        gpu_memory_utilization=0.9,  # Adjust as needed
        max_model_len=29456,  # Adjust based on model/hardware capabilities
    )

    max_workers = max_workers or max(1, multiprocessing.cpu_count() - 1)

    dataset: Dataset = load_dataset(
        repo_id,
        split=split,
        num_proc=max_workers,
    )

    if num_rows is None:
        num_rows = dataset.num_rows
    if num_rows < dataset.num_rows:
        dataset = dataset.take(num_rows)

    processor_config = load_processor_config(
        dataset=dataset,
        config_path=config,
        max_workers=max_workers,
        num_rows=num_rows,
        batch_size=batch_size,
        vllm_model=vllm_model,
    )

    for column in processor_config.sorted_columns:
        dataset = process_column(
            dataset=dataset,
            llm=llm,
            processor_config=processor_config,
            column_name=column,
        )

    augmented_dataset = dataset

    augmented_dataset.push_to_hub(
        destination,
        split=destination_split,
        create_pr=create_pr,
        num_proc=max_workers,
    )

    rprint(f"[bold green]Dataset successfully extended and pushed to https://huggingface.co/datasets/{destination}[/]")


if __name__ == "__main__":
    typer.run(main)
