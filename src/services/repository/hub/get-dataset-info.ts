import {
  type ListFileEntry,
  type RepoId,
  type RepoType,
  listFiles,
} from '@huggingface/hub';

export interface SplitInfo {
  name: string;
  files: string[];
}

export interface SubsetsInfo {
  name: string;
  splits: SplitInfo[];
}

export interface DatasetInfo {
  subsets: SubsetsInfo[];
}

/**
 * Retrieves information about a dataset from a repository.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.repoId - The ID of the repository.
 * @param {string} params.accessToken - The access token for authentication.
 * @returns {Promise<DatasetInfo>} A promise that resolves to the dataset information.
 *
 * The function fetches the dataset information by listing files in the repository.
 * It iterates through the files and identifies directories as subsets.
 * For each subset, it retrieves the splits and includes them in the result if any splits are found.
 */
export const getDatasetInfo = async ({
  repoId,
  accessToken,
}: {
  repoId: string;
  accessToken: string;
}): Promise<DatasetInfo> => {
  const repo = {
    name: repoId,
    type: 'dataset' as RepoType,
  };
  const revision = '~parquet';

  const subsets = [];
  for await (const subset of listFiles({
    repo,
    accessToken,
    revision,
    recursive: false,
  })) {
    if (subset.type === 'directory') {
      const splits = await getSubsetSplits({
        repo,
        accessToken,
        revision,
        subset,
      });

      if (splits.length > 0) {
        subsets.push({
          name: subset.path,
          splits,
        });
      }
    }
  }

  return { subsets };
};

async function listParquetFiles({
  repo,
  accessToken,
  revision,
  split,
}: {
  repo: RepoId;
  accessToken: string;
  revision: string;
  split: ListFileEntry;
}): Promise<string[]> {
  const files = [];
  for await (const file of listFiles({
    repo,
    accessToken,
    revision,
    recursive: true,
    path: split.path,
  })) {
    if (file.type === 'file' && file.path.endsWith('.parquet')) {
      files.push(file.path);
    }
  }

  return files;
}

async function getSubsetSplits({
  repo,
  accessToken,
  revision,
  subset,
}: {
  repo: RepoId;
  accessToken: string;
  revision: string;
  subset: ListFileEntry;
}): Promise<SplitInfo[]> {
  const splits = [];
  for await (const split of listFiles({
    repo,
    accessToken,
    revision,
    recursive: false,
    path: subset.path,
  })) {
    if (split.type === 'directory') {
      const files = await listParquetFiles({
        repo,
        accessToken,
        revision,
        split,
      });

      if (files.length > 0) {
        splits.push({
          name: split.path.replace(`${subset.path}/`, ''),
          files,
        });
      }
    }
  }

  return splits;
}
