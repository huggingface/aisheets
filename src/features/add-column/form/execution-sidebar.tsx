import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuX } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { useExecution } from '~/features/add-column/form/execution';
import { ExecutionForm } from '~/features/add-column/form/execution-form';

export const ExecutionSidebar = component$(() => {
  const { column, isOpenExecutionSidebar, close } = useExecution();

  if (!column.value) return null;

  return (
    <aside
      class={cn(
        'fixed top-16 right-6 z-[52] bottom-16 w-[700px] bg-gradient-to-r from-white to-gray-50 shadow-lg transition-transform duration-200 translate-x-full border border-neutral-200 rounded-sm',
        {
          'translate-x-0': isOpenExecutionSidebar.value,
        },
      )}
    >
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between p-4">
          <h2 class="text-lg font-semibold">{column.value?.name}</h2>

          <Button
            look="ghost"
            class="rounded-full hover:bg-neutral-200 cursor-pointer transition-colors w-[30px] h-[30px]"
            onClick$={close}
            tabIndex={0}
            aria-label="Close"
          >
            <LuX class="text-sm text-neutral" />
          </Button>
        </div>

        <hr />

        <div
          class="flex-1 overflow-y-auto p-4"
          key={`${column.value.id}-${Date.now()}`}
        >
          <ExecutionForm />
        </div>
      </div>
    </aside>
  );
});
