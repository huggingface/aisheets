import { component$ } from '@builder.io/qwik';
import { LuDownload } from '@qwikest/icons/lucide';
import { Label, Popover, buttonVariants } from '~/components';
import { CSVDownload } from './csv-download';
import { ExportToHub } from './export-to-hub';

export const SaveDataset = component$(() => {
  return (
    <Popover.Root flip={false} floating="right-start" gutter={14}>
      <Popover.Trigger class={buttonVariants({ look: 'outline', size: 'sm' })}>
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
