import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { DatasetName } from '~/features/datasets';
import { Table } from '~/features/table';

import { useSession } from '~/loaders';
import { ActiveDatasetProvider } from '~/state';

export default component$(() => {
  const session = useSession();

  return (
    <ActiveDatasetProvider>
      <div class="min-w-screen px-6">
        <div class="flex justify-end items-center w-full mt-6">
          <span>{session.value.user.username}</span>
        </div>
        <div class="flex justify-between items-center w-full mb-4 pt-4">
          <DatasetName />
        </div>
        <Table />
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
