import { $, component$, useComputed$, useSignal } from '@builder.io/qwik';
import { LuDownload } from '@qwikest/icons/lucide';
import { Button } from '~/components';
import { Tooltip } from '~/components/ui/tooltip/tooltip';
import { type Column, useColumnsStore, useDatasetsStore } from '~/state';
import { useGenerateFile } from '~/usecases/generate-file.usecase';

const FORMAT_DISPLAY_NAMES = {
  csv: 'CSV',
  parquet: 'Parquet',
} as const;

const formatDisplayName = (
  format: keyof typeof FORMAT_DISPLAY_NAMES,
): string => {
  return FORMAT_DISPLAY_NAMES[format];
};

export const FileDownload = component$<{
  format: 'csv' | 'parquet';
  showText?: boolean;
  toolTip?: string;
}>(({ format = 'csv', showText = true, toolTip }) => {
  const generateFile = useGenerateFile();

  const { activeDataset } = useDatasetsStore();
  const { columns } = useColumnsStore();

  const downloading = useSignal(false);

  const canDownloadFile = useComputed$(() => {
    if (!activeDataset.value) return false;
    if (activeDataset.value.columns.length === 0) return false;

    if (format === 'csv' && columns.value.some(hasBlobContent)) return false;

    return true;
  });

  const downloadTask = $(async () => {
    downloading.value = true;

    try {
      const csvContent = await generateFile({
        dataset: activeDataset.value,
        format,
      });

      // Create a blob and a download link
      const blob = new Blob([csvContent], {
        type: blobFormat(format),
      });
      const url = URL.createObjectURL(blob);

      // Create a temporary <a> element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeDataset.value.name}.${format}`);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('An error occurred while downloading the file. Please try again.');
    } finally {
      downloading.value = false;
    }
  });

  const body = (
    <Button
      look="ghost"
      class="disabled:text-neutral-300 hover:bg-neutral-100 w-full flex justify-start items-center"
      onClick$={downloadTask}
      disabled={downloading.value || !canDownloadFile.value}
    >
      {toolTip && (
        <Tooltip
          text={`Download as ${formatDisplayName(format)}`}
          floating="right-start"
        />
      )}
      <div class="w-full flex items-center justify-start hover:bg-neutral-100 gap-2 p-2 rounded-none rounded-bl-md rounded-br-md">
        <LuDownload class="w-4 h-4" />
        {showText && `Download ${formatDisplayName(format)}`}
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
});

//Refactor, duplicated
const hasBlobContent = (column: Column): boolean => {
  return column.type.includes('BLOB');
};

const blobFormat = (format: string) => {
  switch (format) {
    case 'csv':
      return 'text/csv;charset=utf-8;';
    case 'parquet':
      return 'application/octet-stream';
    default:
      throw new Error('Unsupported format');
  }
};
