import type { DatasetEntry } from '@huggingface/hub';
import * as hub from '@huggingface/hub';

export const listDatasets = async ({
  accessToken,
  query,
  limit,
}: {
  accessToken: string;
  query?: string;
  limit?: number;
}): Promise<DatasetEntry[]> => {
  const hubDatasets = [];
  for await (const dataset of hub.listDatasets({
    accessToken,
    search: query ? { query: query } : undefined,
    limit,
  })) {
    hubDatasets.push(dataset);
  }

  return hubDatasets;
};
