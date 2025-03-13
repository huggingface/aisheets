import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { useModals } from '~/components/hooks';
import { Markdown } from '~/components/ui/markdown/markdown';
import type { Cell } from '~/state';

export const TableCell = component$<{
  cell: Cell;
}>(({ cell }) => {
  const {
    generic: { open: openModal },
  } = useModals('cell-editor');

  return (
    <td
      class={cn(
        'relative min-w-80 w-80 max-w-80 min-h-[100px] h-[100px] cursor-pointer border-[0.5px] border-t-0 border-r-0 break-words align-top group',
        {
          'bg-green-50 border-green-300': cell.validated,
          'border-neutral-300': !cell.validated,
        },
      )}
      onDblClick$={(e) => {
        e.stopPropagation();
        openModal({ id: cell.id, value: cell.value });
      }}
    >
      <div class="relative h-full">
        <div
          class="relative h-full overflow-hidden"
          style={{ maxHeight: '8.5rem' }}
        >
          {cell.error ? (
            <span class="mt-2 p-4 text-red-500 text-xs flex items-center gap-1">
              <span>⚠</span>
              <span>{cell.error}</span>
            </span>
          ) : (
            <div class="h-full mt-2 p-4">
              <Markdown class="text-gray-900" content={cell.value ?? ''} />
            </div>
          )}
        </div>
      </div>
    </td>
  );
});
