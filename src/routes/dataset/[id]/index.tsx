import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { DatasetName } from '~/features/datasets';
import { ExportToHub } from '~/features/export-to-hub';
import { Table } from '~/features/table';
import { Username } from '~/features/user/username';

export default component$(() => {
  return (
    <div class="flex flex-col h-full w-full gap-2">
      <div class="sticky">
        <div class="flex flex-col gap-2">
          <div class="flex justify-end items-center w-full gap-4">
            <ExportToHub />
            <Username />
          </div>

          <DatasetName />
        </div>
      </div>
      <Table />
    </div>
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
