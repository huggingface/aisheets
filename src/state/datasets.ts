import {
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';
import {
  type RequestEventBase,
  routeLoader$,
  server$,
} from '@builder.io/qwik-city';
import { getAllColumns, getOrCreateDataset } from '~/services';
import { type Column, useColumnsStore, useLoadColumns } from '~/state/columns';
import { useServerSession } from '~/state/session';

export interface Dataset {
  id: string;
  name: string;
  createdBy: string;
  columns: Column[];
}

const datasetsContext = createContextId<Signal<Dataset>>('datasets.context');
export const useLoadDatasets = () => {
  const dataset = useDatasetsLoader();
  useLoadColumns(dataset.value.columns);

  useContextProvider(datasetsContext, dataset);
};

export const useDatasetsLoader = routeLoader$<Dataset>(async function (
  this: RequestEventBase<QwikCityPlatform>,
) {
  const session = useServerSession(this);
  const dataset = await getOrCreateDataset({ createdBy: session.user.name });
  const columns = await getAllColumns(dataset.id);

  return {
    id: dataset.id,
    name: dataset.name,
    createdBy: dataset.createdBy,
    columns,
  };
});

export const useDatasetsStore = () => {
  const datasets = useContext(datasetsContext);
  const activeDataset = useSignal(datasets.value);

  return {
    state: datasets,
    activeDataset,
    setDataset: (newDataset: Dataset) => {
      datasets.value = {
        ...newDataset,
      };
    },
  };
};
