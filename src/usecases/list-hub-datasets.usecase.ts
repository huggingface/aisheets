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
    if (!session.token) return [];

    const query = searchQuery.trim();

    const datasets = await listDatasets({
      query,
      accessToken: session.token,
      limit: 10,
    });

    return datasets.map((dataset) => dataset.name);
  });

export const useListDatasetDataFiles = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    repoId: string,
  ): Promise<string[]> {
    const session = useServerSession(this);
    if (!session.token) return [];

    const files = await listHubDatasetDataFiles({
      repoId,
      accessToken: session.token,
    });

    return files;
  });
