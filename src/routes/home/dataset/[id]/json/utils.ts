import type { RequestEvent } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services';
import { generateDatasetConfig } from '~/usecases/create-dataset-config';

export const datasetAsJson = async (event: RequestEvent) => {
  const dataset = await getDatasetById(event.params.id);

  if (!dataset) {
    event.json(404, {
      error: 'Dataset not found',
    });
    return;
  }

  const config = await generateDatasetConfig(dataset);

  event.json(200, {
    id: dataset.id,
    name: dataset.name,
    cretedBy: dataset.createdBy,
    createdAt: dataset.createdAt,
    ...config,
  });
};
