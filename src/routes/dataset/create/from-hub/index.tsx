import { component$ } from '@builder.io/qwik';
import { ImportFromHub } from '~/features/import-from-hub/import-from-hub';
import { useLoadDatasets } from '~/state';

export { useDatasetsLoader } from '~/state';

export default component$(() => {
  useLoadDatasets();

  return (
    <div class="flex justify-center w-full">
      <ImportFromHub />
    </div>
  );
});
