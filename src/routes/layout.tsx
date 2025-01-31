import { Slot, component$ } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';

import { ModalsProvider } from '~/components';

export const onGet: RequestHandler = async ({
  cacheControl,
  cookie,
  sharedMap,
}) => {
  cacheControl({
    staleWhileRevalidate: 60 * 60 * 24 * 7,
    maxAge: 5,
  });
};

export default component$(() => {
  return (
    <div class="min-h-screen bg-white">
      <ModalsProvider>
        <Slot />
      </ModalsProvider>
    </div>
  );
});
