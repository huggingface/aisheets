import {
  component$,
  createContextId,
  Slot,
  useContext,
  useContextProvider,
} from '@builder.io/qwik';

import { ModalsProvider } from '~/components';
import { MainSidebar } from '~/features/main-sidebar';
import {
  type ClientConfig,
  type Model,
  useClientConfig,
  useHubModels,
} from '~/loaders';
import { ActiveDatasetProvider } from '~/state';

export * from '~/loaders';

export const configContext = createContextId<ClientConfig>('config.context');

export const useConfigContext = () => {
  return useContext(configContext);
};

export const modelsContext = createContextId<Model[]>('models.context');

export const useModelsContext = () => {
  return useContext(modelsContext);
};

export default component$(() => {
  const config = useClientConfig();
  const models = useHubModels();

  useContextProvider(configContext, config.value);
  useContextProvider(modelsContext, models.value);

  return (
    <ModalsProvider>
      <div class="flex-row flex h-screen">
        <ActiveDatasetProvider>
          <MainSidebar />
          <main class="min-w-screen h-screen px-6 pt-4 w-full overflow-y-auto">
            <Slot />
          </main>
        </ActiveDatasetProvider>
      </div>
    </ModalsProvider>
  );
});
