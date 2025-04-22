import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { LuDownload } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { type Column, useColumnsStore, useDatasetsStore } from '~/state';
import { useGenerateCSVFile } from '~/usecases/generate-csv-file.usecase';

export const CSVDownload = component$(() => {
  const downloading = useSignal(false);

  const generateCSVFile = useGenerateCSVFile();

  const { activeDataset } = useDatasetsStore();

  const { columns } = useColumnsStore();

  const canDowloadCSV = useComputed$(() => {
    if (!activeDataset.value) return false;
    if (activeDataset.value.columns.length === 0) return false;

    if (columns.value.some(hasBlobContent)) return false;

    return true;
  });

  const downloadTask = $(async () => {
    downloading.value = true;

    try {
      const csvConent = await generateCSVFile({ dataset: activeDataset.value });

      // Create a blob and a download link
      const blob = new Blob([csvConent], { type: 'text/csv;charset=utf-8;' });
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

  return (
    <div class="flex flex-col gap-2 md:flex-row md:items-center">
      <Button
        look="ghost"
        size="md"
        class="disabled:text-neutral-300 hover:bg-neutral-100 w-full flex justify-start items-center"
        onClick$={downloadTask}
        disabled={downloading.value || !canDowloadCSV.value}
      >
        <div class="flex items-center justify-start gap-4">
          <LuDownload class="w-4 h-4" />
          Download CSV
        </div>
      </Button>
    </div>
  );
});

const hasBlobContent = (column: Column): boolean => {
  return column.type.includes('BLOB');
};
