import {
  $,
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
} from '@builder.io/qwik';
import { useActiveDatasetLoader } from '~/loaders';
import type { Column } from '~/state/columns';

export interface Dataset {
  id: string;
  name: string;
  createdBy: string;
  columns: Column[];
}

export const datasetsContext =
  createContextId<Signal<Dataset>>('datasets.context');

export const useLoadActiveDatasetProvider = () => {
  const dataset = useActiveDatasetLoader();

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
