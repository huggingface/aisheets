import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

import { Table } from '~/components';
export { useColumnsLoader } from '~/state';
import { AddColumn, Commands } from '~/features';

import { useHome } from '~/routes/useHome';

export default component$(() => {
  const { columns, onCreateColumn } = useHome();

  return (
    <div class="mx-auto px-4 pt-2">
      <Commands />

      <Table columns={columns} />

      <AddColumn onCreateColumn={onCreateColumn} />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Argilla - V3',
  meta: [
    {
      name: 'description',
      content: 'Argilla - V3',
    },
  ],
};
