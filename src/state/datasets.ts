import {
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';
import { type RequestEventBase, routeLoader$ } from '@builder.io/qwik-city';
import { getOrCreateDataset } from '~/services';
import type { Column } from '~/state/columns';
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

  return await getOrCreateDataset({ createdBy: session.user.username });
});

export const useLoadDatasets = () => {
  const dataset = useDatasetsLoader();
  useContextProvider(datasetsContext, dataset);
};

export const useDatasetsStore = () => {
  const dataset = useContext(datasetsContext);
  const activeDataset = useSignal(dataset.value);

  return {
    activeDataset,
  };
};
