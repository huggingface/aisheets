import { Slot, component$ } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';

import { ModalsProvider } from '~/components';
import { MainSidebar } from '~/components/ui/main-sidebar/main-sidebar';

export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

export default component$(() => {
  return (
    <div class="flex-row flex max-h-screen">
      <MainSidebar />
      <div class="w-full h-screen overflow-auto">
        <ModalsProvider>
          <Slot />
        </ModalsProvider>
      </div>
    </div>
  );
});
