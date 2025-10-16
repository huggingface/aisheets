import {
  $,
  component$,
  type NoSerialize,
  noSerialize,
  sync$,
  useOnWindow,
  useSignal,
  useStylesScoped$,
} from '@builder.io/qwik';
import { Link, useNavigate } from '@builder.io/qwik-city';
import { usePopover } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import {
  LuFilePlus2,
  LuFileSpreadsheet,
  LuFileType,
  LuFileUp,
  LuFolderUp,
  LuImage,
} from '@qwikest/icons/lucide';

import { Button, buttonVariants, Popover } from '~/components';
import { useClickOutside } from '~/components/hooks/click/outside';
import { HFLogo } from '~/components/ui/logo/logo';
import { useConfigContext } from '~/routes/home/layout';

export const DragAndDrop = component$(() => {
  const popoverId = 'uploadFilePopover';
  const anchorRef = useSignal<HTMLElement | undefined>();
  const { hidePopover } = usePopover(popoverId);
  const isPopOverOpen = useSignal(false);
  const { MAX_ROWS_IMPORT } = useConfigContext();

  const file = useSignal<NoSerialize<File>>();
  const files = useSignal<NoSerialize<File[]>>();
  const isDragging = useSignal(false);
  const navigate = useNavigate();

  const allowedExtensions = ['csv', 'tsv', 'xlsx', 'xls', 'parquet', 'arrow'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'bmp', 'webp', 'tiff'];

  const uploadErrorMessage = useSignal<string | null>(null);

  const traverseFileTreeAsync = (
    item: any,
    path: string,
    fileList: File[],
  ): Promise<void> => {
    return new Promise((resolve) => {
      if (item.isFile) {
        item.file((file: File) => {
          fileList.push(file);
          resolve();
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          for (const entry of entries) {
            await traverseFileTreeAsync(
              entry,
              path + item.name + '/',
              fileList,
            );
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  const handleUploadFile$ = $(async () => {
    hidePopover();
    uploadErrorMessage.value = null;

    if (files.value) {
      const maxFileSizeMB = 10;
      const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

      const imageFiles = files.value.filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return (
          ext && imageExtensions.includes(ext) && file.size <= maxFileSizeBytes
        );
      });

      if (imageFiles.length === 0) {
        uploadErrorMessage.value = 'No valid image files found in folder';
        return;
      }

      // Limit to maxRowsImport to save resources
      const limitedImageFiles = imageFiles.slice(0, MAX_ROWS_IMPORT);
      const folderName = limitedImageFiles[0].webkitRelativePath
        ? limitedImageFiles[0].webkitRelativePath.split('/')[0]
        : 'images';

      if (imageFiles.length > MAX_ROWS_IMPORT) {
        console.warn(
          `Found ${imageFiles.length} images, limiting to ${MAX_ROWS_IMPORT} to save resources`,
        );
      }

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      limitedImageFiles.forEach((file) => {
        const relativePath = file.webkitRelativePath || file.name;
        zip.file(relativePath, file);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const response = await fetch('/api/upload-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/zip',
          'X-Folder-Name': encodeURIComponent(folderName),
          'X-Images-Count': limitedImageFiles.length.toString(),
          'X-Chunk-Size': zipBlob.size.toString(),
        },
        body: zipBlob,
      });

      if (!response.ok) {
        uploadErrorMessage.value = 'Failed to upload images';
        return;
      }

      const { id } = await response.json();
      navigate('/home/dataset/' + id);
      return;
    } else if (file.value) {
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

      const response = await fetch('/api/upload-file', {
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
    }

    file.value = undefined;
    files.value = undefined;
    isDragging.value = false;
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
.import-container {
  background: linear-gradient(135deg, #ffd21e 0%, #6b86ff 100%);
  border-radius: 12px;
  padding: 2px;
}
.import-content {
  background: white;
  border-radius: 10px;
  padding: 48px 32px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}
.thin-stroke svg {
  stroke-width: 1;
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
          class="relative h-full w-full flex justify-center items-center min-h-[15vh]"
          onDragOver$={() => {
            isDragging.value = true;
          }}
          onDragLeave$={(e, el) => {
            isDragging.value = el.contains(e.relatedTarget as Node);
          }}
          onDrop$={sync$((e: DragEvent) => {
            isDragging.value = false;

            if (e.dataTransfer?.items?.length) {
              const items = Array.from(e.dataTransfer.items);
              const folderItems: File[] = [];

              let hasFolders = false;
              for (const item of items) {
                if (item.kind === 'file') {
                  const entry = item.webkitGetAsEntry();
                  if (entry?.isDirectory) {
                    hasFolders = true;
                    break;
                  }
                }
              }

              if (hasFolders) {
                const processFolders = async () => {
                  for (const item of items) {
                    if (item.kind === 'file') {
                      const entry = item.webkitGetAsEntry();
                      if (entry?.isDirectory) {
                        await traverseFileTreeAsync(entry, '', folderItems);
                      }
                    }
                  }

                  if (folderItems.length > 0) {
                    files.value = noSerialize(folderItems);
                    handleUploadFile$();
                  } else {
                    uploadErrorMessage.value = 'No files found in folder';
                  }
                };

                processFolders();
              } else if (e.dataTransfer?.files?.length) {
                file.value = noSerialize(e.dataTransfer.files[0]);
                handleUploadFile$();
              }
            } else if (e.dataTransfer?.files?.length) {
              const droppedFiles = Array.from(e.dataTransfer.files);
              const hasRelativePaths = droppedFiles.some(
                (file) => file.webkitRelativePath,
              );

              if (hasRelativePaths) {
                files.value = noSerialize(droppedFiles);
                handleUploadFile$();
              } else {
                file.value = noSerialize(e.dataTransfer.files[0]);
                handleUploadFile$();
              }
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
          <input
            type="file"
            id="folder-select"
            webkitdirectory={true}
            class="hidden"
            onChange$={(e: Event) => {
              const input = e.target as HTMLInputElement;

              if (input.files?.length) {
                files.value = noSerialize(Array.from(input.files));

                handleUploadFile$();
              }
            }}
          />

          <div class="flex flex-col items-center justify-center gap-2 h-full">
            <div class="flex items-center justify-center mb-0">
              <div class="w-[100px] h-[100px] flex items-center justify-center -mr-8 thin-stroke">
                <LuImage class="w-[50px] h-[50px] text-yellow-400" />
              </div>
              <div class="w-[100px] h-[100px] flex items-center justify-center -mt-12 -mx-4 thin-stroke">
                <LuFileType class="w-[50px] h-[50px] text-yellow-400" />
              </div>
              <div class="w-[100px] h-[100px] flex items-center justify-center -ml-8 thin-stroke">
                <LuFileSpreadsheet class="w-[50px] h-[50px] text-yellow-400" />
              </div>
            </div>

            <h2 class="text-primary-600 font-semibold text-xl -mt-6 mb-1">
              Analyze and enrich your data with AI
            </h2>
            <p class="text-gray-600 text-center mb-4">
              Drop your files or folder
            </p>

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
                Import
              </Popover.Trigger>
              <Popover.Panel
                class="w-86 text-sm shadow-lg p-2"
                onToggle$={(e) => {
                  isPopOverOpen.value = e.newState == 'open';
                }}
              >
                <Button
                  look="ghost"
                  class="w-full flex items-center justify-start hover:bg-neutral-100 gap-2.5 p-2 rounded-none rounded-tl-md rounded-tr-md"
                  onClick$={() =>
                    document.getElementById('folder-select')?.click()
                  }
                >
                  <LuFolderUp class="w-4 h-4 flex-shrink-0" />
                  Upload folder with images
                </Button>

                <Button
                  look="ghost"
                  class="w-full flex items-center justify-start hover:bg-neutral-100 gap-2.5 p-2 rounded-none"
                  onClick$={() =>
                    document.getElementById('file-select')?.click()
                  }
                >
                  <LuFileUp class="w-4 h-4 flex-shrink-0" />
                  Upload file ({allowedExtensions.join(', ')})
                </Button>

                <hr class="border-t border-slate-200 dark:border-slate-700" />

                <Link
                  href="/home/dataset/create/from-hub"
                  class={cn(
                    'w-full flex items-center justify-start hover:bg-neutral-100 gap-2.5 p-2 rounded-none rounded-bl-md rounded-br-md',
                  )}
                >
                  <HFLogo class="items-left w-4 h-4 flex-shrink-0" />
                  Import from Hub
                </Link>
              </Popover.Panel>
            </Popover.Root>

            {(file.value || files.value) && !uploadErrorMessage.value && (
              <div class="w-fit text-sm text-neutral-50 bg-black opacity-30 rounded-sm p-2 flex items-center justify-between gap-3">
                {file.value?.name ||
                  `${
                    files.value?.filter((f) => {
                      const ext = f.name.split('.').pop()?.toLowerCase();
                      return (
                        ext &&
                        imageExtensions.includes(ext) &&
                        f.size <= 10 * 1024 * 1024
                      );
                    }).length || 0
                  } images`}
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
