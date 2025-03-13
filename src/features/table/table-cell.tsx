import { $, component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuThumbsUp } from '@qwikest/icons/lucide';
import { useModals } from '~/components/hooks';
import { Button } from '~/components/ui/button/button';
import { Markdown } from '~/components/ui/markdown/markdown';
import type { Cell } from '~/state';
import { useColumnsStore } from '~/state';
import { useValidateCellUseCase } from '~/usecases/validate-cell.usecase';

export const TableCell = component$<{
  cell: Cell;
}>(({ cell }) => {
  const {
    generic: { open: openModal },
  } = useModals('cell-editor');
  const validateCell = useValidateCellUseCase();
  const { replaceCell } = useColumnsStore();

  const onValidateCell = $(async (validated: boolean) => {
    const ok = await validateCell({
      id: cell.id,
      value: cell.value!,
      validated,
    });

    if (ok) {
      replaceCell({
        ...cell,
        validated,
        updatedAt: new Date(),
      });
    }
  });

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
            <>
              <Button
                look="ghost"
                hover={false}
                size="sm"
                class={cn(
                  'absolute z-10 text-base top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity',
                  cell.validated
                    ? 'bg-green-50/50 text-green-400 hover:bg-green-100'
                    : 'hover:bg-gray-100 text-gray-400',
                )}
                onClick$={(e) => {
                  e.stopPropagation();
                  onValidateCell(!cell.validated);
                }}
              >
                <LuThumbsUp class="text-sm" />
              </Button>
              <div class="h-full mt-2 p-4">
                <Markdown class="text-gray-900" content={cell.value ?? ''} />
              </div>
            </>
          )}
        </div>
      </div>
    </td>
  );
});
