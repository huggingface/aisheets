import {
  $,
  type NoSerialize,
  component$,
  noSerialize,
  sync$,
  useSignal,
} from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { cn } from '@qwik-ui/utils';
import { LuFilePlus2 } from '@qwikest/icons/lucide';
import { Button } from '~/components';

export const DragAndDrop = component$(() => {
  const file = useSignal<NoSerialize<File>>();
  const isDragging = useSignal(false);
  const navigate = useNavigate();

  const uploadErrorMessage = useSignal<string | null>(null);

  const handleUploadFile$ = $(async () => {
    if (!file.value) return;

    const stream = file.value.stream();
    const reader = stream.getReader();
    const fileName = `${file.value.name}`;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

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
      navigate('/dataset/' + id);
    }
  });

  return (
    <div
      preventdefault:dragover
      preventdefault:drop
      class={cn('relative w-full h-full p-6 text-center transition z-10', {
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
        class={cn('w-full flex flex-col justify-center items-center gap-3', {
          'opacity-30': isDragging.value,
        })}
      >
        <span>From real-world data</span>

        <Button
          class="flex gap-1 bg-white"
          onClick$={() => document.getElementById('file-select')?.click()}
        >
          <LuFilePlus2 class="text-lg" />
          Drop or click to start with a file
        </Button>

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
