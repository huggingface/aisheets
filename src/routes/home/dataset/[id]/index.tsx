import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { DatasetName } from '~/features/datasets';
import { SaveDataset } from '~/features/export';
import { MainSidebarButton } from '~/features/main-sidebar';

import { Table } from '~/features/table';
import { Username } from '~/features/user/username';

export default component$(() => {
  return (
    <div class="flex flex-col h-full w-full">
      <div class="sticky">
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center w-full gap-1">
            <div class="flex items-center w-fit gap-4">
              <MainSidebarButton />
              <DatasetName />
              <SaveDataset />
            </div>
            <Username />
          </div>
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
