import { Slot, component$ } from '@builder.io/qwik';
import { type RequestHandler, useLocation } from '@builder.io/qwik-city';

import { ModalsProvider } from '~/components';
import { MainSidebar } from '~/features/main-sidebar';
import { ActiveDatasetProvider } from '~/state';

export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

const remove_layout = ['/sign-in'];

export * from '~/loaders';

export default component$(() => {
  const location = useLocation();

  if (remove_layout.some((path) => location.url.pathname.startsWith(path))) {
    return <Slot />;
  }

  return (
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
  );
});
