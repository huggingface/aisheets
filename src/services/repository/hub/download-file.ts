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
  const repo = {
    name: repoId,
    type: 'dataset' as RepoType,
  };

  const destination = await downloadFileToCacheDir({
    repo: {
      name: repoId,
      type: 'dataset',
    },
    path: file,
    accessToken,
  });

  return destination;
};
