import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Execution } from '~/features';

import { DatasetName } from '~/features/datasets/dataset-name';
import { Table } from '~/features/table/table';
import { useDatasetsStore, useLoadDatasets, useSession } from '~/state';

export { useDatasetsLoader } from '~/state';

export { useSession } from '~/state';

export default component$(() => {
  useLoadDatasets();
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
