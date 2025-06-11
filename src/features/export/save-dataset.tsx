import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { LuDownload } from '@qwikest/icons/lucide';
import { Label, Popover, buttonVariants } from '~/components';
import { useSession } from '~/loaders';
import { TEMPORAL_ID, useDatasetsStore } from '~/state';
import { ExportToHub } from './export-to-hub';
import { FileDownload } from './file-download';

export const SaveDataset = component$(() => {
  const { activeDataset } = useDatasetsStore();
  const session = useSession();

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
        {!session.value.anonymous && (
          <>
            <ExportToHub />
            <hr class="border-t border-slate-200 dark:border-slate-700" />
          </>
        )}
        <FileDownload format="csv" />
        <hr class="border-t border-slate-200 dark:border-slate-700" />
        <FileDownload format="parquet" />
      </Popover.Panel>
    </Popover.Root>
  );
});
