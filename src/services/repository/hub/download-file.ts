import { type RepoType, downloadFileToCacheDir } from '@huggingface/hub';

export const downloadDatasetFile = async ({
  repoId,
  file,
  accessToken,
}: {
  repoId: string;
  file: string;
  accessToken: string;
}): Promise<string> => {
  return await downloadFileToCacheDir({
    repo: {
      name: repoId,
      type: 'dataset' as RepoType,
    },
    path: file,
    accessToken,
  });
};
