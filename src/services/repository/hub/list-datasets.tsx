import type { DatasetEntry } from '@huggingface/hub';
import * as hub from '@huggingface/hub';

export const listDatasets = async ({
  accessToken,
  query,
}: {
  accessToken: string;
  query?: string;
}): Promise<DatasetEntry[]> => {
  const hubDatasets = [];
  for await (const dataset of hub.listDatasets({
    accessToken,
    search: query ? { query: query } : undefined,
  })) {
    hubDatasets.push(dataset);
  }

  return hubDatasets;
};
