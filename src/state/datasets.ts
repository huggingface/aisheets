import {
  type Signal,
  createContextId,
  useContext,
  useContextProvider,
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

export const loadDatasetsFromServer = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Dataset[]> {
  const session = useServerSession(this);
  const dataset = await getOrCreateDataset({ username: session.user.name });

  return [
    {
      id: dataset.id,
      name: dataset.name,
      createdBy: dataset.createdBy,
    },
  ];
});

export const useLoadDatasets = () => {
  const datasets = useDatasetsLoader();

  useContextProvider(datasetsContext, datasets);

  return datasets;
};

export const useDatasetsLoader = routeLoader$<Dataset[]>(async () =>
  loadDatasetsFromServer(),
);

export const useDatasetsStore = () => {
  const datasets = useContext(datasetsContext);

  return {
    state: datasets,
    getCurrentDataset: () => {
      return datasets.value[0];
    },
    setDatasets: (newDatasets: Dataset[]) => {
      datasets.value = newDatasets;
    },
  };
};
