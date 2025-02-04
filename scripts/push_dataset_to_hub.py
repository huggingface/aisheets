from datasets import load_dataset, Dataset
from typer import Typer

app = Typer()


@app.command()
def push_dataset_to_hub(
    path: str = "data/dataset.json",
    dataset_owner: str = "username",
    dataset_name: str = "dataset-name",
    auth_token: str = None,
    private: bool = True,
):
    dataset = load_dataset("json", data_files=path, split="train")

    dataset.push_to_hub(
        f"{dataset_owner}/{dataset_name}",
        token=auth_token,
        split="train",
        private=private,
    )


if __name__ == "__main__":
    app()
