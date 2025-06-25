import { component$ } from '@builder.io/qwik';
import type { Cell } from '~/state';

export const CellError = component$<{ cell: Cell }>(({ cell }) => {
  if (!cell.error) return null;

  return (
    <span class="mt-2 p-4 text-red-500 text-xs flex items-center gap-1">
      <span>⚠</span>
      <span>{cell.error}</span>
    </span>
  );
});
