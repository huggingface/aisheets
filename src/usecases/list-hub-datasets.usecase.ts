import { type RequestEventBase, server$ } from '@builder.io/qwik-city';

import { listDatasets } from '~/services/repository/hub/list-datasets';
import { listHubDatasetDataFiles } from '~/services/repository/hub/list-hub-dataset-files';
import { useServerSession } from '~/state';

export const useListHubDatasets = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    searchQuery: string,
  ): Promise<string[]> {
    const session = useServerSession(this);
    const query = searchQuery.trim();

    try {
      const datasets = await listDatasets({
        query,
        accessToken: session.token,
        limit: 10,
      });

      return datasets.map((dataset) => dataset.name);
    } catch (error) {
      console.error('Error listing datasets:', error);
      return [];
    }
  });

export const useListDatasetDataFiles = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    repoId: string,
  ): Promise<string[]> {
    const session = useServerSession(this);

    const files = await listHubDatasetDataFiles({
      repoId,
      accessToken: session.token,
    });

    return files;
  });
