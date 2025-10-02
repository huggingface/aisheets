import { component$, Slot } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';
import { ExecutionProvider } from '~/features/add-column';
import { ActiveDatasetProvider } from '~/state';

// Disable caching for /dataset/[id]
export const onGet: RequestHandler = async ({ cacheControl }) => {
  cacheControl({
    maxAge: 0,
    sMaxAge: 0,
    staleWhileRevalidate: 0,
  });
};

export default component$(() => {
  return (
    <ActiveDatasetProvider>
      <ExecutionProvider>
        <Slot />
      </ExecutionProvider>
    </ActiveDatasetProvider>
  );
});
