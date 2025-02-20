import { component$ } from '@builder.io/qwik';
import { ImportFromHub } from '~/features/import-from-hub/import-from-hub';

export default component$(() => {
  return (
    <div class="flex justify-center w-full">
      <ImportFromHub />
    </div>
  );
});
