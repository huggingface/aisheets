import {
  $,
  type Signal,
  Slot,
  component$,
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

const datasetsContext = createContextId<Signal<Dataset>>('datasets.context');

export const ActiveDatasetProvider = component$(() => {
  const dataset = useActiveDatasetLoader();
  useContextProvider(datasetsContext, dataset);

  return <Slot />;
});

export const useDatasetsStore = () => {
  const activeDataset = useContext(datasetsContext);

  return {
    activeDataset,
    updateOnActiveDataset: $((dataset: Partial<Dataset>) => {
      activeDataset.value = { ...activeDataset.value, ...dataset };
    }),
  };
};
