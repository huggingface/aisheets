import { component$, useComputed$ } from '@builder.io/qwik';
import { useActiveModal } from '~/components';
import { useColumnsStore } from '~/state';

export const TableCellHeaderForExecution = component$<{ index: number }>(
  ({ index }) => {
    const { state: columns } = useColumnsStore();
    const { args } = useActiveModal();

    const indexColumnEditing = useComputed$(() =>
      columns.value.findIndex((column) => column.id === args.value?.columnId),
    );

    if (indexColumnEditing.value !== index) return null;

    return <th class="min-w-[600px] w-[600px]" />;
  },
);
