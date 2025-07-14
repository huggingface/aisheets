import { component$ } from '@builder.io/qwik';
import { Skeleton } from '~/components';
import type { Cell } from '~/state';

export const CellSkeleton = component$<{ cell: Cell }>(({ cell }) => {
  if (!cell.generating) return null;

  return (
    <div class="absolute inset-0 flex items-center justify-center">
      <Skeleton />
    </div>
  );
});
