import { type RepoType, listFiles } from '@huggingface/hub';

const SUPPORTED_EXTENSIONS = ['.parquet', '.jsonl', '.csv'];

export const listHubDatasetDataFiles = async ({
  repoId,
  accessToken,
  revision,
}: {
  repoId: string;
  accessToken: string;
  revision?: string;
}): Promise<string[]> => {
  const repo = {
    name: repoId,
    type: 'dataset' as RepoType,
  };
  const files = [];
  for await (const file of listFiles({
    repo,
    accessToken,
    revision,
    recursive: true,
  })) {
    if (
      file.type === 'file' &&
      SUPPORTED_EXTENSIONS.some((ext) => file.path.endsWith(ext))
    ) {
      files.push(file.path);
    }
  }

  return files;
};
