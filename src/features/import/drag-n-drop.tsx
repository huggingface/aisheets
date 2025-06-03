import {
  $,
  type NoSerialize,
  component$,
  noSerialize,
  sync$,
  useContext,
  useSignal,
} from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuFilePlus2, LuUpload } from '@qwikest/icons/lucide';
import { Button, Popover, buttonVariants } from '~/components';
import { GoogleDrive, HFLogo } from '~/components/ui/logo/logo';
import { configContext } from '~/routes/home/layout';

export const DragAndDrop = component$(() => {
  const { isGoogleAuthEnabled } = useContext(configContext);

  const file = useSignal<NoSerialize<File>>();
  const isDragging = useSignal(false);
  const navigate = useNavigate();

  const allowedExtensions = ['csv', 'tsv', 'xlsx', 'xls'];

  const uploadErrorMessage = useSignal<string | null>(null);

  const handleUploadFile$ = $(async () => {
    uploadErrorMessage.value = null;

    if (!file.value) return;

    const fileName = file.value.name;
    const fileExtension = file.value.name.split('.').pop();

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      uploadErrorMessage.value = `Invalid file type. Supported types: ${allowedExtensions.join(', ')}`;
      return;
    }

    const value = await file.value.arrayBuffer();

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Chunk-Size': value.byteLength.toString(),
        'X-File-Name': encodeURIComponent(fileName),
      },
      body: value,
    });

    if (!response.ok) {
      uploadErrorMessage.value =
        'Failed to upload file. Please try again or provide another file.';
      return;
    }

    const { id } = await response.json();
    navigate('/home/dataset/' + id);
  });

  return (
    <div
      preventdefault:dragover
      preventdefault:drop
      class={cn('relative w-full h-full text-center transition z-10', {
        'bg-primary-50 rounded-sm': isDragging.value,
      })}
      onDragOver$={() => {
        isDragging.value = true;
      }}
      onDragLeave$={(e, el) => {
        isDragging.value = el.contains(e.relatedTarget as Node);
      }}
      onDrop$={sync$((e: DragEvent) => {
        isDragging.value = false;

        if (e.dataTransfer?.files?.length) {
          file.value = noSerialize(e.dataTransfer.files[0]);

          handleUploadFile$();
        }
      })}
    >
      <input
        type="file"
        id="file-select"
        accept={allowedExtensions.map((ext) => `.${ext}`).join(',')}
        class="hidden"
        onChange$={(e: Event) => {
          const input = e.target as HTMLInputElement;

          if (input.files?.length) {
            file.value = noSerialize(input.files[0]);

            handleUploadFile$();
          }
        }}
      />

      <div
        class={cn('w-full flex flex-col justify-center items-center gap-5', {
          'opacity-30': isDragging.value,
        })}
      >
        <span class="text-neutral-500 font-medium">From real-world data</span>

        <Popover.Root flip={false} floating="bottom-start" gutter={14}>
          <Popover.Trigger
            class={cn(
              buttonVariants({ look: 'outline', size: 'sm' }),
              'text-primary-600 disabled:text-neutral-300 disabled:cursor-not-allowed',
            )}
          >
            <LuFilePlus2 class="text-lg mr-2" />
            Drop or click to start with a file
          </Popover.Trigger>
          <Popover.Panel class="w-86 text-sm shadow-lg p-2">
            <Link
              href="/home/dataset/create/from-hub"
              class={cn(
                'w-full flex items-center justify-start hover:bg-neutral-100 gap-2.5 p-2 rounded-none rounded-tl-md rounded-tr-md',
              )}
            >
              <HFLogo class="items-left w-4 h-4 flex-shrink-0" />
              Add from Hugging Face Hub
            </Link>

            {isGoogleAuthEnabled && (
              <>
                <hr class="border-t border-slate-200 dark:border-slate-700" />
                <Button
                  look="ghost"
                  class="w-full flex items-center justify-start hover:bg-neutral-100 gap-2.5 p-2 rounded-none"
                  onClick$={() => {
                    navigate('/home/dataset/create/from-google-drive');
                  }}
                >
                  <GoogleDrive class="w-4 h-4 flex-shrink-0" />
                  Add from Google Drive
                </Button>
              </>
            )}

            <hr class="border-t border-slate-200 dark:border-slate-700" />

            <Button
              look="ghost"
              class="w-full flex items-center justify-start hover:bg-neutral-100 gap-2.5 p-2 rounded-none rounded-bl-md rounded-br-md"
              onClick$={() => document.getElementById('file-select')?.click()}
            >
              <LuUpload class="w-4 h-4 flex-shrink-0" />
              Upload from computer ({allowedExtensions.join(', ')})
            </Button>
          </Popover.Panel>
        </Popover.Root>

        {file.value && !uploadErrorMessage.value && (
          <div class="w-fit text-sm text-neutral-50 bg-black opacity-30 rounded-sm p-2 flex items-center justify-between gap-3">
            {file.value.name}
            <div class="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {uploadErrorMessage.value && (
          <div class="text-red-500 text-sm mt-2">
            {uploadErrorMessage.value}
          </div>
        )}
      </div>
      <div
        class={cn(
          'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 invisible',
          {
            visible: isDragging.value,
          },
        )}
      >
        Drop your file here
      </div>
    </div>
  );
});
