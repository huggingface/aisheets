# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "datasets",
#     "huggingface-hub",
#     "rich",
#     "typer",
# ]
# ///

import multiprocessing
import random
import time
import traceback
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
import typer
import yaml
from datasets import Dataset, load_dataset
from huggingface_hub import InferenceClient
from rich import print as rprint
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn


class Pipeline:
    """A parallel pipeline for generating dataset rows using language models."""

    def __init__(
        self,
        *,
        repo_id: str,
        subset: str | None = None,
        split: str = "train",
        config: str | None = None,
        num_rows: int | None = None,
        bill_to: str | None = None,
        max_workers: int | None = None,
        debug: bool = False,
        request_delay: float = 0
    ) -> None:
        """
        Initialize the pipeline.

        Args:
            config: Path or URL to YAML configuration file
            num_rows: Number of rows to generate (if None with source_dataset, uses entire dataset)
            max_workers: Maximum number of concurrent workers (defaults to CPU count - 1)
            debug: Enable debug logging (default: False)
            request_delay: Delay in seconds between API requests (default: 0)

        Raises:
            ValueError: If no root nodes are found in the dependency graph
        """
        self.debug = debug
        self.console = Console()
        self.request_delay = request_delay
        self.bill_to = bill_to

        with self.console.status("[bold green]Loading configuration..."):
            self.config = self._load_config(config)

            # Handle source dataset if specified
            self.source_dataset = self._load_source_dataset(repo_id=repo_id, subset=subset, split=split)
            self.source_columns = set()

            # Get columns from source dataset
            available_columns = set(self.source_dataset.features.keys())
            self.source_columns = available_columns

            self.num_rows = num_rows
            # If num_rows is None, get the dataset size
            if self.num_rows is None:
                self.num_rows = self._get_dataset_size(repo_id, split, subset)

            # Validate no overlap between source and generated columns
            generated_columns = set(self.config.get('columns', {}).keys())
            if overlap := (self.source_columns & generated_columns):
                raise ValueError(f"Columns defined in both source dataset and generation config: {overlap}")

            self.results: list[dict] = []
            self.max_workers = max_workers or max(1, multiprocessing.cpu_count() - 1)

            # Build dependency graph
            self._build_dependency_graph()
            self._display_configuration_summary()

    def _get_dataset_size(self, repo_id: str, split: str, subset: str | None = None) -> int | None:
        # Load dataset info (not the actual dataset)
        from datasets import load_dataset_builder

        builder = load_dataset_builder(repo_id, subset)
        info = builder.info

        # Get the number of examples in the specified split
        if hasattr(info, 'splits') and split in info.splits:
            return info.splits[split].num_examples
        else:
            # Fallback if split info is not available
            self.console.print("[yellow]Warning: Could not determine dataset size. Using streaming mode.")
            return None

    @staticmethod
    def _load_config(yml_source: str) -> dict:
        """Load and parse YAML configuration from file or URL."""
        if yml_source.startswith(('http://', 'https://')):
            response = requests.get(
                yml_source,
                headers={'Accept': 'application/x-yaml; application/json'}
            )
            response.raise_for_status()
            return yaml.safe_load(response.text)

        with open(yml_source) as f:
            return yaml.safe_load(f)

    def _build_dependency_graph(self) -> None:
        """Build directed dependency graph from configuration."""
        self.graph = defaultdict(list)
        self.reverse_graph = defaultdict(list)
        all_nodes = set()
        dependent_nodes = set()

        # Add source columns as potential dependencies
        all_nodes.update(self.source_columns)

        for col, config in self.config.get('columns', {}).items():
            all_nodes.add(col)
            if deps := config.get('columnsReferences'):
                # Validate dependencies exist in either source or generated columns
                invalid_deps = set(deps) - (self.source_columns | set(self.config['columns'].keys()))
                if invalid_deps:
                    raise ValueError(f"Invalid dependencies for {col}: {invalid_deps}")

                for dep in deps:
                    self.graph[dep].append(col)
                    self.reverse_graph[col].append(dep)
                    # Only mark as dependent if it depends on non-source columns
                    if dep not in self.source_columns:
                        dependent_nodes.add(col)

        # A node is a root if it:
        # 1. Is not a source column AND
        # 2. Either has no dependencies OR only depends on source columns
        self.root_nodes = [
            node for node in self.config.get('columns', {}).keys()
            if node not in dependent_nodes
        ]

        if not self.root_nodes and self.config.get('columns'):
            raise ValueError("No root nodes found! Circular dependencies may exist.")

    def get_client_for_node(self, node, bill_to: str | None = None) -> InferenceClient:
        config = self.config['columns'][node]

        return InferenceClient(
            provider=config['modelProvider'],
            bill_to=bill_to,
        )

    def _debug_log(self, message: str) -> None:
        """Print debug message if debug mode is enabled."""
        if self.debug:
            rprint(message)

    def process_node(self, node: str, row: dict, bill_to: str | None = None) -> tuple[str, str]:
        """Process a single node in the pipeline."""
        try:
            if node in self.source_columns:
                return node, row[node]

            self._debug_log(f"[cyan]Processing node {node} with row data: {row}")

            config = self.config['columns'][node]
            prompt = self._prepare_prompt(config['prompt'], row)

            self._debug_log(f"[cyan]Getting client for {node}...")
            client = self.get_client_for_node(node, bill_to=bill_to)

            self._debug_log(f"[cyan]Generating completion for {node} with prompt: {prompt}")
            result = self._generate_completion(client, config['modelName'], prompt)

            if not result or result.isspace():
                raise ValueError(f"Empty or whitespace-only response from model")

            self._debug_log(f"[green]Completed {node} with result: {result[:100]}...")
            return node, result

        except Exception as e:
            self._log_error(node, e)
            raise

    def _prepare_prompt(self, prompt: str, row: dict) -> str:
        """Prepare prompt template by filling in values from row."""
        for key, value in row.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in prompt:
                self._debug_log(f"[cyan]Replacing {placeholder} with: {value}")
                prompt = prompt.replace(placeholder, str(value))

        self._debug_log(f"[yellow]Final prompt:\n{prompt}")
        return prompt

    def _generate_completion(self, client: InferenceClient, model: str, prompt: str) -> str:
        """Generate completion using the specified model."""
        messages = [{"role": "user", "content": prompt}]

        # Implement retry with exponential backoff for rate limiting
        max_retries = 5
        retry_count = 0
        base_delay = self.request_delay or 1.0  # Use request_delay if set, otherwise default to 1 second

        while retry_count < max_retries:
            try:
                # Add delay if specified to avoid rate limiting
                if retry_count > 0 or self.request_delay > 0:
                    # Calculate exponential backoff with jitter
                    if retry_count > 0:
                        delay = base_delay * (2 ** retry_count) + random.uniform(0, 1)
                        self._debug_log(
                            f"[yellow]Rate limit hit. Retrying in {delay:.2f} seconds (attempt {retry_count + 1}/{max_retries})")
                    else:
                        delay = base_delay
                    time.sleep(delay)

                completion = client.chat.completions.create(
                    model=model,
                    messages=messages,
                )
                return completion.choices[0].message.content

            except Exception as e:
                # Check if it's a rate limit error
                if "429" in str(e) or "rate_limit" in str(e).lower():
                    retry_count += 1
                    if retry_count >= max_retries:
                        self._debug_log(f"[red]Max retries reached for rate limit. Giving up.")
                        raise
                else:
                    # Not a rate limit error, re-raise
                    raise

        # Should not reach here, but just in case
        raise Exception("Failed to generate completion after maximum retries")

    def generate_row(self, progress, task_nodes, row_num, row_data=None):
        """Process a single node in the pipeline."""
        try:
            row = {}
            if row_data:
                row.update(row_data)
                progress.update(task_nodes, description=f"[cyan]Row {row_num}: Loaded source data")

            queue = deque(self.root_nodes)
            in_progress = set()
            processed_nodes = set()

            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                while queue or in_progress:
                    ready_nodes = [
                        node for node in queue
                        if node not in processed_nodes
                           and node not in in_progress
                           and all(dep in row for dep in self.reverse_graph[node])
                    ]

                    for node in ready_nodes:
                        queue.remove(node)
                        progress.update(task_nodes, description=f"[cyan]Row {row_num}: Processing {node}")

                    futures = {
                        executor.submit(self.process_node, node, row, self.bill_to): node
                        for node in ready_nodes
                    }
                    in_progress.update(futures.values())

                    for future in as_completed(futures):
                        node = futures[future]
                        try:
                            node, result = future.result()
                            row[node] = result
                            in_progress.remove(node)
                            processed_nodes.add(node)
                            progress.advance(task_nodes)

                            for dependent in self.graph[node]:
                                if (dependent not in processed_nodes and
                                        dependent not in queue and
                                        dependent not in in_progress):
                                    queue.append(dependent)
                        except Exception as e:
                            in_progress.remove(node)
                            processed_nodes.add(node)
                            progress.update(task_nodes, description=f"[red]Row {row_num}: Failed {node}")
                            raise

            return row
        except Exception as e:
            self._debug_log(f"\n[red]Error processing row {row_num}: {str(e)}")
            raise

    def run(self):
        start_time = time.time()
        with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(complete_style="green", finished_style="green"),
                TaskProgressColumn(),
                console=self.console,
                expand=True
        ) as progress:
            task_rows = progress.add_task("[bold cyan]Generating dataset rows", total=self.num_rows)
            task_nodes = progress.add_task("[cyan]Processing nodes (per row)", total=len(self.config['columns']))

            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:

                # If num_rows is None, use the entire dataset
                if self.num_rows is None:
                    dataset_iter = enumerate(self.source_dataset)
                    # Update progress bar with unknown total
                    progress.update(task_rows, total=None)
                else:
                    dataset_iter = enumerate(self.source_dataset.take(self.num_rows))

                futures = {
                    executor.submit(
                        self.generate_row,
                        progress,
                        task_nodes,
                        i + 1,
                        dict(source_row)  # Convert to dict if streaming
                    ): i
                    for i, source_row in dataset_iter
                }

                for future in as_completed(futures):
                    i = futures[future]
                    row_num = i + 1
                    try:
                        row = future.result()
                        self.results.append(row)
                        progress.advance(task_rows)
                        progress.update(task_rows,
                                        description=f"[bold green]✓ Completed {len(self.results)}/{self.num_rows} rows")
                        progress.reset(task_nodes)  # Reset node progress for next row
                    except Exception as e:
                        progress.update(task_rows, description=f"[bold red]✗ Row {row_num} failed")
                        rprint(f"\n[red]Error in row {row_num}: {str(e)}")
                        continue

        total_time = time.time() - start_time
        minutes = int(total_time // 60)
        seconds = int(total_time % 60)

        if len(self.results) == self.num_rows:
            rprint(Panel(
                f"[bold green]✓[/] Successfully generated all {self.num_rows} rows!\nTotal time: {minutes}m {seconds}s"))
        else:
            rprint(Panel(
                f"[bold yellow]![/] Completed with {len(self.results)}/{self.num_rows} rows generated\nTotal time: {minutes}m {seconds}s"))

        # Create Hugging Face dataset with both source and generated columns
        dataset_dict = {}

        # Add source columns first
        for col in self.source_columns:
            dataset_dict[col] = [row.get(col) for row in self.results]

        # Add generated columns
        for col in self.config['columns']:
            dataset_dict[col] = [row.get(col) for row in self.results]

        dataset = Dataset.from_dict(dataset_dict)
        return dataset

    @staticmethod
    def _log_error(node: str, e: Exception) -> None:
        print(f"\n❌ Error in node {node}:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        print(f"Full traceback:")
        traceback.print_exc()

    @staticmethod
    def _load_source_dataset(
        repo_id: str,
        subset: str | None = None,
        split: str = "train"
    ) -> Dataset:

        """Load the source dataset from Hugging Face Hub."""

        return load_dataset(
            repo_id,
            subset,
            split=split,
            streaming=True
        )

    def _display_configuration_summary(self) -> None:
        summary = [
            f"[bold green]Pipeline Configuration Summary[/]",
            f"• Source columns: [cyan]{len(self.source_columns)}[/]",
            f"• Generated columns: [cyan]{len(self.config.get('columns', {}))}[/]",
            f"• Worker threads: [cyan]{self.max_workers}[/]",
            f"• Rows to generate: [cyan]{self.num_rows}[/]",
        ]

        if self.source_columns:
            summary.append("\n[bold blue]Source Dataset:[/]")
            for col in sorted(self.source_columns):
                summary.append(f"• [cyan]{col}[/]")

        if self.config.get('columns'):
            summary.append("\n[bold blue]Models and Providers:[/]")
            # Add model and provider information for each generated node
            for node, config in self.config['columns'].items():
                model_name = config['modelName']
                provider = config['modelProvider']
                summary.append(f"• [cyan]{node}[/]: {model_name} ({provider})")

            summary.append("\n[bold blue]Node Dependencies:[/]")
            # Add dependency information for each node
            for node in self.config['columns']:
                deps = self.reverse_graph[node]
                if deps:
                    summary.append(f"• [cyan]{node}[/] ← {', '.join(deps)}")
                else:
                    summary.append(f"• [cyan]{node}[/] (root node)")

        rprint(Panel("\n".join(summary)))

    @staticmethod
    def _is_sheets_dataset_url(url: str) -> bool:
        """Check if the URL points to a (AI)Sheets dataset."""
        return "/home/dataset/" in url and "/json" not in url


def main(
    *,
    repo_id: str,
    split: str = "train",
    config: str = './config.yml',
    destination: str,
    destination_split: str = "train",
    create_pr: bool = False,
    num_rows: int | None = None,
    bill_to: str | None = None,
    max_workers: int | None = None,
    debug: bool = False,
):
    """
    Main entry point for the dataset augmentation pipeline.

    Args:
        repo_id: The dataset repository ID to augment (e.g., "fka/awesome-chatgpt-prompts").
        split: Dataset split to use (default: "train").
        config: Path to the YAML configuration file for the pipeline.
        destination: Destination repository ID for the augmented dataset.
        destination_split: Split name for the destination dataset (default: "train").
        create_pr: Whether to create a pull request for the destination dataset (default: False).
        bill_to: Billing account for the inference client (if applicable).
        num_rows: Number of rows to use (if None, uses entire dataset).
        max_workers: Maximum number of concurrent workers (defaults to CPU count - 1).
        debug: Enable debug logging (default: False).
    """

    pipeline = Pipeline(
        repo_id=repo_id,
        subset=None,
        split=split,
        config=config,
        num_rows=num_rows,
        bill_to=bill_to,
        request_delay=0.5,
        max_workers=max_workers,
        debug=debug,
    )

    augmented_dataset = pipeline.run()
    augmented_dataset.push_to_hub(destination, split=destination_split, create_pr=create_pr)

    rprint(
        f"\n[bold green]✓[/] Successfully pushed augmented dataset to [cyan] https://huggingface.co/datasets/{destination}[/].")


if __name__ == "__main__":
    typer.run(main)
