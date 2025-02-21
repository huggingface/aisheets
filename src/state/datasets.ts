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

const EMPTY_DATASET = {
  id: '',
  name: '',
  createdBy: '',
  columns: [],
};

export const datasetsContext =
  createContextId<Signal<Dataset>>('datasets.context');

export const useDatasetsLoader = routeLoader$<Dataset>(
  async ({ redirect, params }) => {
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

export const useLoadDatasets = () => {
  const dataset = useDatasetsLoader();
  useContextProvider(datasetsContext, dataset);
};

export const useDatasetsStore = () => {
  const activeDataset = useContext(datasetsContext);

  return {
    activeDataset,
    updateActiveDataset: $((dataset: Dataset) => {
      activeDataset.value = { ...dataset };
    }),
  };
};
