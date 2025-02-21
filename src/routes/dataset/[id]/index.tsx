import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { DatasetName } from '~/features/datasets';
import { Execution } from '~/features/execution';
import { Table } from '~/features/table';

import { useSession } from '~/loaders';
import { useDatasetsStore, useLoadActiveDatasetProvider } from '~/state';

export default component$(() => {
  useLoadActiveDatasetProvider();
  const session = useSession();
  const { activeDataset } = useDatasetsStore();

  return (
    <div class="min-w-screen px-6">
      <div class="flex justify-end items-center w-full mt-6">
        <span>{session.value.user.username}</span>
      </div>
      <div class="flex justify-between items-center w-full mb-4 pt-4">
        <DatasetName dataset={activeDataset.value} />
        <Execution />
      </div>
      <Table />
    </div>
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
