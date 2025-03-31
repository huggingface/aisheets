import { Slot, component$ } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';

import { ModalsProvider } from '~/components';
import { MainSidebar } from '~/features/main-sidebar';
import { ActiveDatasetProvider, SessionProvider } from '~/state';

export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

export * from '~/loaders';

export default component$(() => {
  return (
    <SessionProvider>
      <ModalsProvider>
        <div class="flex-row flex max-h-screen">
          <ActiveDatasetProvider>
            <MainSidebar />
            <main class="min-w-screen h-screen px-6 pt-4 w-full overflow-hidden">
              <Slot />
            </main>
          </ActiveDatasetProvider>
        </div>
      </ModalsProvider>
    </SessionProvider>
  );
});
