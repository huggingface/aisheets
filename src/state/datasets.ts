import {
  $,
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
} from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { getDatasetById } from '~/services/repository';
import type { Column } from '~/state/columns';

export interface Dataset {
  id: string;
  name: string;
  createdBy: string;
  columns: Column[];
}

export const datasetsContext =
  createContextId<Signal<Dataset>>('datasets.context');

export const useDatasetsLoader = routeLoader$<Dataset>(async ({ params }) => {
  const id = params.id;

  const dataset = await getDatasetById(id);

  if (!dataset) {
    //TODO: Redirect to 404 ?
    throw new Error('Dataset not found');
  }

  return dataset;
});

export const useLoadDatasets = () => {
  const dataset = useDatasetsLoader();
  useContextProvider(datasetsContext, dataset);
};

export const useDatasetsStore = () => {
  const activeDataset = useContext(datasetsContext);

  return {
    activeDataset,

    updateActiveDataset: $((dataset: Dataset) => {
      activeDataset.value = dataset;
    }),
  };
};
