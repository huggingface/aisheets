import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuX } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { useExecution } from '~/features/add-column/form/execution';
import { ExecutionForm } from '~/features/add-column/form/execution-form';

export const ExecutionSidebar = component$(() => {
  const { column, isOpenExecutionSidebar, close } = useExecution();

  return (
    <aside
      class={cn(
        'fixed top-0 right-0 z-[52] h-screen w-[700px] bg-gradient-to-r from-white to-gray-50 shadow-lg transition-transform duration-300 translate-x-full',
        {
          'translate-x-0': isOpenExecutionSidebar.value,
        },
      )}
    >
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between p-4 border-b">
          <h2 class="text-lg font-semibold">Column {column.value?.name}</h2>
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

        <div class="flex-1 overflow-y-auto p-4">
          <ExecutionForm />
        </div>
      </div>
    </aside>
  );
});
