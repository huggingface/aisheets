import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { LuDownload } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { type Column, useColumnsStore, useDatasetsStore } from '~/state';
import { useGenerateCSVFile } from '~/usecases/generate-csv-file.usecase';

export const CSVDownload = component$<{ showText?: boolean; toolTip?: string }>(
  ({ showText = true, toolTip }) => {
    const downloading = useSignal(false);

    const generateCSVFile = useGenerateCSVFile();

    const { activeDataset } = useDatasetsStore();

    const { columns } = useColumnsStore();

    const canDownloadCSV = useComputed$(() => {
      if (!activeDataset.value) return false;
      if (activeDataset.value.columns.length === 0) return false;

      if (columns.value.some(hasBlobContent)) return false;

      return true;
    });

    const downloadTask = $(async () => {
      downloading.value = true;

      try {
        const csvContent = await generateCSVFile({
          dataset: activeDataset.value,
        });

        // Create a blob and a download link
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);

        // Create a temporary <a> element and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${activeDataset.value.name}.csv`);
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading CSV:', error);
        alert(
          'An error occurred while downloading the CSV file. Please try again.',
        );
      } finally {
        downloading.value = false;
      }
    });

    const body = (
      <Button
        look="ghost"
        class="disabled:text-neutral-300 hover:bg-neutral-100 w-full flex justify-start items-center"
        onClick$={downloadTask}
        disabled={downloading.value || !canDownloadCSV.value}
      >
        {toolTip && <Tooltip text="Download as CSV" floating="right-start" />}
        <div class="w-full flex items-center justify-start hover:bg-neutral-100 gap-2 p-2 rounded-none rounded-bl-md rounded-br-md">
          <LuDownload class="w-4 h-4" />
          {showText && 'Download CSV'}
        </div>
      </Button>
    );

    if (toolTip) {
      return (
        <Tooltip text={toolTip} floating="right-start">
          {body}
        </Tooltip>
      );
    }
    // If no tooltip, return the button directly

    return body;
  },
);

//Refactor, duplicated
const hasBlobContent = (column: Column): boolean => {
  return column.type.includes('BLOB');
};
