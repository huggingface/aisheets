import {
  $,
  type NoSerialize,
  component$,
  noSerialize,
  sync$,
  useContext,
  useOnWindow,
  useSignal,
  useStylesScoped$,
} from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { usePopover } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import { LuFilePlus2, LuUpload } from '@qwikest/icons/lucide';
import { Button, Popover, buttonVariants } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { GoogleDrive, HFLogo } from '~/components/ui/logo/logo';
import { configContext } from '~/routes/home/layout';

export const DragAndDrop = component$(() => {
  const popoverId = 'uploadFilePopover';
  const anchorRef = useSignal<HTMLElement | undefined>();
  const { hidePopover } = usePopover(popoverId);
  const isPopOverOpen = useSignal(false);

  const { isGoogleAuthEnabled } = useContext(configContext);

  const file = useSignal<NoSerialize<File>>();
  const isDragging = useSignal(false);
  const navigate = useNavigate();

  const allowedExtensions = ['csv', 'tsv', 'xlsx', 'xls', 'parquet'];

  const uploadErrorMessage = useSignal<string | null>(null);

  const handleUploadFile$ = $(async () => {
    hidePopover();

    uploadErrorMessage.value = null;

    if (!file.value) return;

    try {
      const fileName = file.value.name;
      const fileExtension = file.value.name.split('.').pop();

      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        uploadErrorMessage.value = `Invalid file type. Supported types: ${allowedExtensions.join(', ')}`;
        return;
      }
      const maxFileSizeMB = 25;
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

      if (file.value.size > maxFileSizeBytes) {
        uploadErrorMessage.value = `File is too large. Maximum allowed size is ${maxFileSizeMB} MB.`;
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
    } finally {
      file.value = undefined;
      isDragging.value = false;
    }
  });

  const container = useClickOutside(
    $(() => {
      hidePopover();
    }),
  );

  const isMobile = useSignal(false);

  useOnWindow(
    'resize',
    $(() => {
      isMobile.value = window.innerWidth <= 768;
      console.log('isMobile', isMobile.value);
    }),
  );

  useStylesScoped$(`
@keyframes border-animation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
.animated-border {
  background-image: linear-gradient(270deg, #ffd21e, #6b86ff, #ffd21e);
  background-size: 400% 400%;
  animation: border-animation 4s linear infinite;
}
`);

  return (
    <div class="relative w-full h-full text-center transition z-10 p-[2px] rounded-lg animated-border">
      <div class="relative h-full w-full bg-white p-8 rounded-md">
        <div
          class={cn(
            'absolute inset-0  transition-opacity duration-300 opacity-0',
            {
              "bg-[url('/dnd-background.svg')] bg-no-repeat bg-cover opacity-100":
                isDragging.value || isPopOverOpen.value,
            },
          )}
        />
        <div
          ref={container}
          preventdefault:dragover
          preventdefault:drop
          class={cn(
            'relative h-full min-h-[180px] w-full flex justify-center items-center',
          )}
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

          <div class="flex flex-col items-center justify-center gap-6 h-full">
            <h2 class="text-primary-600 font-semibold text-xl">
              Expand, analyze, enrich your data
            </h2>

            <Popover.Root
              key={isMobile.value ? 'mobile' : 'desktop'}
              id={popoverId}
              bind:anchor={anchorRef}
              manual
              floating={isMobile.value ? 'bottom' : 'right'}
              gutter={14}
            >
              <Popover.Trigger
                disabled={!!file.value}
                class={cn(
                  buttonVariants({ look: 'outline', size: 'sm' }),
                  'flex gap-1 justify-between items-center px-3 py-5 bg-neutral-700 text-white disabled:text-neutral-300 disabled:cursor-not-allowed hover:bg-neutral-600',
                  {
                    'bg-neutral-600': isDragging.value || isPopOverOpen.value,
                  },
                )}
              >
                <LuFilePlus2 class="text-md" />
                Drop or click to import a file
              </Popover.Trigger>
              <Popover.Panel
                class="w-86 text-sm shadow-lg p-2"
                onToggle$={(e) => {
                  isPopOverOpen.value = e.newState == 'open';
                }}
              >
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
                  onClick$={() =>
                    document.getElementById('file-select')?.click()
                  }
                >
                  <LuUpload class="w-4 h-4 flex-shrink-0" />
                  Upload from computer
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
        </div>
      </div>
    </div>
  );
});
