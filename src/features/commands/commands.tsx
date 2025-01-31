import { component$ } from '@builder.io/qwik';
import { TbColumnInsertRight } from '@qwikest/icons/tablericons';

import { useModals } from '~/components/hooks/modals/use-modals';
import { Button } from '~/components/ui';

export const Commands = component$(() => {
  const { openAddColumnModal } = useModals('addColumnModal');

  return (
    <div class="flex h-12 w-full items-center justify-between border-t">
      <div class="flex space-x-2">{/* Left side empty for now */}</div>

      <div class="flex space-x-2">
        <Button
          size="sm"
          look="outline"
          class="flex gap-1 font-light"
          onClick$={openAddColumnModal}
        >
          <TbColumnInsertRight />
          Add column
        </Button>
      </div>
    </div>
  );
});
