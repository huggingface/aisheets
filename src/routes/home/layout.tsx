import {
  Slot,
  component$,
  createContextId,
  useContextProvider,
} from '@builder.io/qwik';

import { ModalsProvider } from '~/components';
import { MainSidebar } from '~/features/main-sidebar';
import { useClientConfig } from '~/loaders';
import { ActiveDatasetProvider } from '~/state';

export * from '~/loaders';

export const configContext =
  createContextId<Record<string, any>>('config.context');

export default component$(() => {
  const config = useClientConfig();
  useContextProvider(configContext, config.value);

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
