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
import { getOrCreateDataset } from '~/services';
import { useServerSession } from '~/state/session';

export interface Dataset {
  id: string;
  name: string;
  createdBy: string;
}

const datasetsContext = createContextId<Signal<Dataset[]>>('datasets.context');
export const useLoadDatasets = () => {
  const datasets = useDatasetsLoader();

  useContextProvider(datasetsContext, datasets);

  return datasets;
};

export const useDatasetsLoader = routeLoader$<Dataset[]>(async function (
  this: RequestEventBase<QwikCityPlatform>,
) {
  const session = useServerSession(this);
  const dataset = await getOrCreateDataset({ createdBy: session.user.name });

  return [
    {
      id: dataset.id,
      name: dataset.name,
      createdBy: dataset.createdBy,
    },
  ];
});

export const useDatasetsStore = () => {
  const datasets = useContext(datasetsContext);
  const activeDataset = useSignal(datasets.value[0]);

  return {
    state: datasets,
    activeDataset,
    setDatasets: (newDatasets: Dataset[]) => {
      datasets.value = [...newDatasets];
    },
  };
};
