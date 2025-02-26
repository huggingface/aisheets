import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { DatasetName } from '~/features/datasets';
import { ExportToHub } from '~/features/export-to-hub';
import { Table } from '~/features/table';
import { Username } from '~/features/user/username';
import { ActiveDatasetProvider } from '~/state';

export default component$(() => {
  return (
    <ActiveDatasetProvider>
      <div class="flex flex-col space-y-2">
        <Username />
        <div class="flex flex-col flex-1 gap-2">
          <div class="flex justify-between items-center w-full">
            <DatasetName />
            <ExportToHub />
          </div>
          <div class="flex-1">
            <Table />
          </div>
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});

export const head: DocumentHead = {
  title: 'easydatagen',
  meta: [
    {
      name: 'description',
      content: 'easydatagen',
    },
  ],
};
