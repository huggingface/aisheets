# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "datasets",
#     "huggingface-hub[hf_transfer]",
#     "rich",
#     "typer",
#     "pillow",
# ]
# ///
import concurrent.futures
import dataclasses
import json
import multiprocessing
import os
import random
import time
from collections import defaultdict
from contextlib import contextmanager
from functools import partial
from typing import Tuple

import requests
import typer
import yaml
from PIL.Image import Image
from datasets import load_dataset, Value, Features, Dataset
from huggingface_hub import InferenceClient
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel


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
    bill_to: str | None = None

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


def _get_dataset_size(repo_id: str, split: str, subset: str | None = None) -> int | None:
    # Load dataset info (not the actual dataset)
    from datasets import load_dataset_builder

    builder = load_dataset_builder(repo_id, subset)
    info = builder.info

    # Get the number of examples in the specified split
    if hasattr(info, 'splits') and split in info.splits:
        return info.splits[split].num_examples
    else:
        # Fallback if split info is not available
        rprint("[yellow]Warning: Could not determine dataset size. Using streaming mode.")
        return None


def _get_client_for_node(
    node: str,
    config: ProcessorConfig,
    bill_to: str | None = None
) -> InferenceClient:
    config = config.columns[node]

    return InferenceClient(
        model=config["modelName"],
        provider=config['modelProvider'],
        bill_to=bill_to,
        # token=hf_inference_token,  # Optionally set a token if needed
    )


@contextmanager
def retries(max_retries: int = 10, delay: float = 1.0):
    attempt = 0



    while True:
        try:
            yield
            break
        except Exception as e:
            attempt += 1
            if attempt > max_retries:
                raise Exception("Max retries exceeded") from e

            delay = delay * (2 ** attempt) + random.uniform(0, 1)

            rprint(
                f"[yellow]Rate limit hit. Retrying in {delay:.2f} seconds "
                f"(attempt {attempt + 1}/{max_retries})"
            )

            time.sleep(delay)


def text_generation_task(
    client: InferenceClient,
    row: dict,
    prompt_template: str,
    request_delay: float | None = 5.0,
) -> str:
    """Generate completion using the specified model."""
    prompt = prepare_prompt(prompt_template, row)
    messages = [{"role": "user", "content": prompt}]

    with retries(delay=request_delay):
        completion = client.chat.completions.create(messages=messages)
        return completion.choices[0].message.content


def image_data_to_data_uri(image: Image) -> str:
    if isinstance(image, str) and image.startswith("http"):
        return image
    elif isinstance(image, str) and os.path.isfile(image):
        with open(image, "rb") as f:
            import base64
            encoded_string = base64.b64encode(f.read()).decode('utf-8')
            return f"data:image/{os.path.splitext(image)[1][1:]};base64,{encoded_string}"
    elif isinstance(image, Image):
        import io
        import base64

        buffered = io.BytesIO()
        image.save(buffered, format="PNG")

        encoded_string = base64.b64encode(buffered.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{encoded_string}"
    else:
        raise ValueError("Unsupported image format")


def image_text_generation_task(
    client: InferenceClient,
    prompt_template: str,
    image_column: str,
    row: dict,
    request_delay: float | None = 5.0,
) -> str:
    """Generate completion using the specified model."""
    prompt = prepare_prompt(prompt_template, row)
    image_data = row[image_column]

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {
                    "url": image_data_to_data_uri(image_data)
                }},
            ]
        }
    ]

    with retries(delay=request_delay):
        completion = client.chat.completions.create(messages=messages)
        return completion.choices[0].message.content


def text_to_image_generation_task(
    client: InferenceClient,
    instruction: str,
    row: dict,
    request_delay: float | None = 5.0,
) -> Image:
    """Generate image using the specified model."""
    prompt = prepare_prompt(instruction, row)

    with retries(delay=request_delay):
        generation = client.text_to_image(prompt)

        return generation


def load_processor_config(
    *,
    config_path: str | None = None,
    config_json: str | None = None,
    dataset: Dataset,
    bill_to: str | None = None,
    max_workers: int | None = None,
    num_rows: int | None = None,
    batch_size: int | None = 1000,
) -> ProcessorConfig:
    with Console().status("[bold green]Loading configuration..."):
        if config_path is None and config_json is None:
            raise ValueError(
                "Either config file path or config JSON string must be provided."
            )

        if config_path and config_json:
            rprint(
                "[yellow]Warning: Both config file and config JSON provided. "
                "Using config JSON."
            )

        if config_json:
            config = json.loads(config_json)
        else:
            if not config_path:
                rprint(
                    "[bold red]Warning: No config file provided. "
                    "Using config default './config.yml'."
                )
                config_path = './config.yml'

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
            bill_to=bill_to,
            batch_size=batch_size,
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
        f"• Batch size: [cyan]{config.batch_size}[/]",
    ]

    if config.source_columns:
        summary.append("\n[bold blue]Source Dataset:[/]")
        for col in sorted(config.source_columns):
            summary.append(f"• [cyan]{col}[/]")

    if config.columns:
        summary.append("\n[bold blue]Models and Providers:[/]")

        # Add model and provider information for each generated node
        for node, column_cfg in config.columns.items():
            model_name = column_cfg['modelName']
            provider = column_cfg['modelProvider']
            summary.append(f"• [cyan]{node}[/]: {model_name} ({provider})")

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
    processor_config: ProcessorConfig,
    column_name: str
) -> Dataset:
    column_config = processor_config.columns[column_name]

    return dataset.map(
        map_function,
        fn_kwargs={
            "column_config": column_config,
            "column_name": column_name,
            "processor_config": processor_config,
        },
        batched=True,
        batch_size=processor_config.batch_size,  # Adjust batch size as needed
        features=Features({
            **dataset.features,
            column_name: Value(column_config.get("dtype", "string")),  # Ensure the new column is of type string
        }),
    )


def prepare_prompt(prompt: str, row: dict) -> str:
    """Prepare prompt template by filling in values from row."""
    for key, value in row.items():
        placeholder = f"{{{{{key}}}}}"
        if placeholder in prompt:
            prompt = prompt.replace(placeholder, str(value))

    return prompt


def map_function(
    batch: dict,
    column_name: str,
    column_config: dict,
    processor_config: ProcessorConfig
) -> dict:
    task = column_config.get("task", "text-generation")
    rows = [dict(zip(batch.keys(), values)) for values in zip(*batch.values())]

    # Process the batch of messages
    client = _get_client_for_node(
        column_name,
        config=processor_config,
        bill_to=processor_config.bill_to
    )

    generation_task = None
    if task == "text-generation":
        generation_task = partial(
            text_generation_task,
            prompt_template=column_config["prompt"])
    elif task == "image-text-to-text":
        generation_task = partial(
            image_text_generation_task,
            prompt_template=column_config["prompt"],
            image_column=column_config["imageColumn"],
        )
    elif task == "text-to-image":
        generation_task = partial(
            text_to_image_generation_task,
            instruction=column_config["instruction"],
        )

    with concurrent.futures.ThreadPoolExecutor(
            max_workers=processor_config.max_workers
    ) as executor:

        futures = []

        for row in rows:
            futures.append(
                executor.submit(generation_task, client=client, row=row)
            )

        results = []
        for future in concurrent.futures.as_completed(futures):
            result = future.result()

            results.append(result)
            rprint(f"[green] {len(results)}/{len(futures)} completed")

    return {column_name: results}


def main(
    *,
    repo_id: str,
    destination: str,
    config: str = None,
    config_json: str | None = None,
    split: str = "train",
    destination_split: str = "train",
    create_pr: bool = False,
    num_rows: int | None = None,
    bill_to: str | None = None,
    max_workers: int | None = None,
    batch_size: int | None = 1000,
):
    max_workers = max_workers or max(1, multiprocessing.cpu_count() - 1)

    if os.uname().sysname == "Darwin":
        import multiprocessing as mp
        import multiprocessing as mp
        from datasets import iterable_dataset as it_ds

        mp.set_start_method("spawn", force=True)
        it_ds.Pool = mp.get_context("spawn").Pool

    dataset: Dataset = load_dataset(
        repo_id,
        split=split,
        streaming=True,
    )

    dataset_rows = _get_dataset_size(repo_id, split=split)
    if num_rows is None:
        num_rows = dataset_rows

    if num_rows < dataset_rows:
        dataset = dataset.take(num_rows)

    processor_config = load_processor_config(
        dataset=dataset,
        config_path=config,
        config_json=config_json,
        bill_to=bill_to,
        max_workers=max_workers,
        num_rows=num_rows,
        batch_size=batch_size,
    )

    start_time = time.time()

    for column in processor_config.sorted_columns:
        dataset = process_column(
            dataset=dataset,
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

    total_time = time.time() - start_time
    minutes = int(total_time // 60)
    seconds = int(total_time % 60)

    rprint(Panel(
        f"[bold green]Dataset successfully extended and pushed to https://huggingface.co/datasets/{destination}[/]\nTotal time: {minutes}m {seconds}s"
    ))


if __name__ == "__main__":
    typer.run(main)
