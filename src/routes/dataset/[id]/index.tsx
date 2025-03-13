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
      <div class="flex flex-col h-full w-full">
        <div class="sticky">
          <div class="flex flex-col">
            <div class="flex justify-end items-center w-full gap-4">
              <ExportToHub />
              <Username />
            </div>

            <DatasetName />
          </div>
        </div>
        <Table />
      </div>
    </ActiveDatasetProvider>
  );
});

export const head: DocumentHead = {
  title: 'Dataground',
  meta: [
    {
      name: 'Dataground',
      content: 'dataground',
    },
  ],
};
