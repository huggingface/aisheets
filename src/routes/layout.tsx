import { Slot, component$ } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';

import { ModalsProvider } from '~/components';
import { NavBar } from '~/components/ui/navbar/navbar';

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
    <>
      <NavBar />
      <ModalsProvider>
        <Slot />
      </ModalsProvider>
    </>
  );
});
