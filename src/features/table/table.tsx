import { component$ } from '@builder.io/qwik';
import { ColumnSizeProvider } from '~/features/table/components/context/colunm-preferences.context';
import { TableBody } from '~/features/table/table-body';
import { TableHeader } from '~/features/table/table-header';
import { TableView } from '~/features/table/table-view';

export const Table = component$(() => {
  return (
    <>
      <div class="flex justify-end w-full mt-2">
        <TableView />
      </div>

      <div class="overflow-auto w-full max-h-full h-screen scrollable rounded-tl-sm relative">
        <table class="text-sm min-w-max grid border-separate border-spacing-0">
          <ColumnSizeProvider>
            <TableHeader />
            <TableBody />
          </ColumnSizeProvider>
        </table>
      </div>
    </>
  );
});
