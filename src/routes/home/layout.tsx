import { Slot, component$ } from '@builder.io/qwik';

import { ModalsProvider } from '~/components';
import { MainSidebar } from '~/features/main-sidebar';
import { ActiveDatasetProvider } from '~/state';

export * from '~/loaders';

export default component$(() => {
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
