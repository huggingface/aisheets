import { component$ } from '@builder.io/qwik';
import { LuDownload } from '@qwikest/icons/lucide';
import { Label, Popover, buttonVariants } from '~/components';
import { CSVDownload } from './csv-download';
import { ExportToHub } from './export-to-hub';

export const SaveDataset = component$(() => {
  return (
    <div class="flex items-left w-full gap-2 ">
      <Popover.Root flip={false}>
        <Popover.Trigger
          class={buttonVariants({ look: 'outline', size: 'sm' })}
        >
          <Label class="flex items-center gap-2">
            <LuDownload class="w-4 h-4" />
          </Label>
        </Popover.Trigger>
        <Popover.Panel class="w-96 max-h-60">
          <div class="flex flex-col gap-1 p-4 bg-white">
            <ExportToHub />

            <CSVDownload />
          </div>
        </Popover.Panel>
      </Popover.Root>
    </div>
  );
});
