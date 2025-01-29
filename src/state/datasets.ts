import {
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';
import { type RequestEventBase, routeLoader$ } from '@builder.io/qwik-city';
import { getOrCreateDataset } from '~/services';
import { type Column, useColumnsStore } from '~/state/columns';
import { useServerSession } from '~/state/session';

export interface Dataset {
  id: string;
  name: string;
  createdBy: string;
  columns: Column[];
}

export const datasetsContext =
  createContextId<Signal<Dataset>>('datasets.context');

export const useDatasetsLoader = routeLoader$<Dataset>(async function (
  this: RequestEventBase<QwikCityPlatform>,
) {
  const session = useServerSession(this);
  const dataset = await getOrCreateDataset({ createdBy: session.user.name });

  return {
    id: dataset.id,
    name: dataset.name,
    createdBy: dataset.createdBy,
    columns: dataset.columns,
  };
});

export const useLoadDatasets = () => {
  const dataset = useDatasetsLoader();
  useContextProvider(datasetsContext, dataset);
};

export const useDatasetsStore = () => {
  const datasets = useContext(datasetsContext);
  const columns = useColumnsStore();

  const activeDataset = useSignal(datasets.value);

  return {
    datasets,
    activeDataset,
    columns,
  };
};
