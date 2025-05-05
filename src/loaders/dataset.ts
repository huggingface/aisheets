import { type RequestEventLoader, routeLoader$ } from '@builder.io/qwik-city';
import { getDatasetById, getUserDatasets } from '~/services';
import { type Dataset, useServerSession } from '~/state';

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

    const dataset = await getDatasetById(id);

    if (!dataset) {
      throw redirect(302, '/');
    }

    return dataset;
  },
);

export const useAllDatasetsLoader = routeLoader$(async function (
  this: RequestEventLoader,
) {
  const session = useServerSession(this);

  return await getUserDatasets(session.user);
});
