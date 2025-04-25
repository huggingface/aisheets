import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuDownload, LuUpload } from '@qwikest/icons/lucide';
import { Button, Label, Popover, buttonVariants } from '~/components';
import { GoogleDrive, HFLogo } from '~/components/ui/logo/logo';

export const ImportDataset = component$(() => {
  return (
    <Popover.Root flip={false} floating="right-start" gutter={14}>
      <Popover.Trigger
        class={cn(
          buttonVariants({ look: 'outline', size: 'sm' }),
          'disabled:text-neutral-300 disabled:cursor-not-allowed',
        )}
      >
        <Label class="flex items-center gap-2">
          <LuDownload class="w-4 h-4" />
        </Label>
      </Popover.Trigger>
      <Popover.Panel class="w-86 max-h-40 shadow-lg p-0">
        <div class="flex items-center justify-start gap-4">
          <HFLogo class="w-4 h-4 flex-shrink-0" />
          Add from Hugging Face Hub
        </div>
        <hr class="border-t border-slate-200 dark:border-slate-700" />

        <div class="flex items-center justify-start gap-4">
          <GoogleDrive class="w-4 h-4 flex-shrink-0" />
          Add from Google Drive
        </div>
        <Button
          class="flex items-center justify-start gap-4"
          look="ghost"
          onClick$={() => document.getElementById('file-select')?.click()}
        >
          <LuUpload class="w-4 h-4" />
          Upload from computer
        </Button>
      </Popover.Panel>
    </Popover.Root>
  );
});
