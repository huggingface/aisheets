import { routeLoader$ } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services';
import type { Dataset } from '~/state';

const EMPTY_DATASET = {
  id: '',
  name: '',
  createdBy: '',
  columns: [],
};

export const useActiveDatasetLoader = routeLoader$<Dataset>(
  async ({ params, redirect }) => {
    const id = params.id;
    if (!id) {
      return EMPTY_DATASET;
    }

    const dataset = await getDatasetById(id, { cellsByColumn: 10 });

    if (!dataset) {
      throw redirect(302, '/');
    }

    return dataset;
  },
);
