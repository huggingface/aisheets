import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuDownload } from '@qwikest/icons/lucide';
import { Label, Popover, buttonVariants } from '~/components';
import { TEMPORAL_ID, useDatasetsStore } from '~/state';
import { CSVDownload } from './csv-download';
import { ExportToHub } from './export-to-hub';

export const SaveDataset = component$(() => {
  const { activeDataset } = useDatasetsStore();

  return (
    <Popover.Root flip={false} floating="right-start" gutter={14}>
      <Popover.Trigger
        class={cn(
          buttonVariants({ look: 'secondary', size: 'sm' }),
          'disabled:cursor-not-allowed bg-white',
        )}
        disabled={
          activeDataset.value.columns.filter((c) => c.id !== TEMPORAL_ID)
            .length === 0
        }
      >
        <Label class="flex items-center gap-2">
          <LuDownload class="w-4 h-4" />
        </Label>
      </Popover.Trigger>
      <Popover.Panel class="w-86 max-h-40 shadow-lg p-0">
        <ExportToHub />
        <hr class="border-t border-slate-200 dark:border-slate-700" />
        <CSVDownload />
      </Popover.Panel>
    </Popover.Root>
  );
});
