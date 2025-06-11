import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuDownload } from '@qwikest/icons/lucide';
import { Label, Popover, buttonVariants } from '~/components';
import { useSession } from '~/loaders';
import { TEMPORAL_ID, useDatasetsStore } from '~/state';
import { CSVDownload } from './csv-download';
import { ExportToHub } from './export-to-hub';

export const SaveDataset = component$(() => {
  const { activeDataset } = useDatasetsStore();

  const session = useSession();

  if (session.value.anonymous) {
    return (
      <div
        class={cn(
          buttonVariants({ look: 'secondary', size: 'sm' }),
          'w-8 h-8 disabled:cursor-not-allowed bg-white',
        )}
      >
        <CSVDownload showText={false} toolTip="Download as CSV" />
      </div>
    );
  }

  return (
    <Popover.Root floating="bottom" gutter={14}>
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
        <Label class="flex items-center">
          <LuDownload class="w-4 h-4" />
        </Label>
      </Popover.Trigger>
      <Popover.Panel class="w-86 text-sm shadow-lg p-2">
        <ExportToHub />
        <hr class="border-t border-slate-200 dark:border-slate-700" />
        <CSVDownload />
      </Popover.Panel>
    </Popover.Root>
  );
});
