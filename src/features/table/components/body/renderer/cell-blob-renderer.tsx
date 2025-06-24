import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { processMediaContent } from '~/features/table/utils/binary-content';
import { isObjectType } from '~/features/table/utils/kind';

interface MediaRendererProps {
  src?: string;
  path?: string;
}

const VideoRenderer = component$<MediaRendererProps>(({ src }) => {
  const isExpanded = useSignal(false);

  return (
    <div
      stoppropagation:click
      stoppropagation:dblclick
      class="w-full h-full"
      onDblClick$={() => {
        isExpanded.value = true;
      }}
      onClick$={() => {
        isExpanded.value = false;
      }}
    >
      <video controls playsInline class="w-full max-w-[600px]">
        <source src={src} />
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>

      {isExpanded.value && (
        <>
          <div class="fixed inset-0 bg-neutral-700/40 z-50" />

          <div
            class="fixed z-[101] bg-white border border-neutral-500 w-3/4 h-3/4 max-w-[800px] max-h-[600px] rounded-sm"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="absolute inset-0 w-full h-full flex items-center justify-center p-4 bg-neutral-50">
              <div class="max-w-full max-h-full overflow-hidden">
                <div class="flex flex-col">
                  <div class="relative w-full h-full flex items-center justify-center">
                    <video controls playsInline class="w-full">
                      <source src={src} />
                      <track kind="captions" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

const AudioRenderer = component$<MediaRendererProps>(({ src }) => {
  const isExpanded = useSignal(false);

  return (
    <div
      stoppropagation:click
      stoppropagation:dblclick
      class="w-full h-full"
      onDblClick$={() => {
        isExpanded.value = true;
      }}
      onClick$={() => {
        isExpanded.value = false;
      }}
    >
      <audio controls src={src} class="w-full max-w-[400px]">
        <track kind="captions" />
      </audio>

      {isExpanded.value && (
        <>
          <div class="fixed inset-0 bg-neutral-700/40 z-50" />

          <div
            class="fixed z-[101] bg-white border border-neutral-500 w-3/4 h-3/4 max-w-[800px] max-h-[600px] rounded-sm"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="absolute inset-0 w-full h-full flex items-center justify-center p-4 bg-neutral-50">
              <div class="max-w-full max-h-full overflow-hidden">
                <div class="flex flex-col">
                  <div class="relative w-full h-full flex items-center justify-center">
                    <audio controls src={src} class="w-full">
                      <track kind="captions" />
                    </audio>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

const ImageRenderer = component$<MediaRendererProps>(({ src, path }) => {
  const isExpanded = useSignal(false);

  return (
    <div
      stoppropagation:click
      stoppropagation:dblclick
      class="w-full h-full"
      onDblClick$={() => {
        isExpanded.value = true;
      }}
      onClick$={() => {
        isExpanded.value = false;
      }}
    >
      <div class="flex flex-col">
        <div class="relative w-full h-full flex items-center justify-center">
          <img src={src} alt={path} class="w-32 h-auto" />
        </div>
      </div>

      {isExpanded.value && (
        <>
          <div class="fixed inset-0 bg-neutral-700/40 z-50" />

          <div
            class="fixed z-[101] bg-white border border-neutral-500 w-3/4 h-3/4 max-w-[800px] max-h-[600px] rounded-sm"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="absolute inset-0 w-full h-full flex items-center justify-center p-4 bg-neutral-50">
              <div class="max-w-full max-h-full overflow-hidden">
                <div class="flex flex-col">
                  <div class="relative w-full h-full flex items-center justify-center">
                    <img src={src} alt={path} class="max-w-full h-auto" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

const UnsupportedContent = component$<{ content: string }>(({ content }) => {
  return <div class="unsupported-content" dangerouslySetInnerHTML={content} />; //Add sandbox where to prevent script execution
});

const ErrorContent = component$<{ content: string }>(({ content }) => {
  return <div class="error-content" dangerouslySetInnerHTML={content} />; //Add sandbox where to prevent script execution
});

export const CellBlobRenderer = component$<CellProps>((props) => {
  const { cell, column } = props;
  const contentValue = useSignal<string | null>();
  const isEditing = useSignal(false);

  useTask$(async ({ track }) => {
    track(() => cell.value);
    track(() => isEditing);

    const processBlob = async (content: any): Promise<any> => {
      if (Array.isArray(content)) {
        const divs = await Promise.all(
          content.map((item) => processBlob(item)),
        );
        contentValue.value = `<div>${divs.join(' ')}</div>`;

        return contentValue.value;
      }

      if (content && !content.bytes && !isObjectType(column)) {
        content.bytes = content;
      }

      const processedInfo = await processMediaContent(content);

      if (processedInfo) {
        contentValue.value = processedInfo.content;
      }

      return contentValue.value;
    };

    contentValue.value = await processBlob(cell.value);
  });

  if (cell.generating) {
    return (
      <div class="flex h-full min-h-[120px]">
        <div class="w-full h-full bg-gray-200 animate-pulse" />
      </div>
    );
  }

  if (!contentValue.value) return null;

  if (
    typeof contentValue.value === 'string' &&
    contentValue.value.startsWith('<')
  ) {
    const doc = new DOMParser().parseFromString(
      contentValue.value,
      'text/html',
    );
    const mediaElement = doc.body.firstElementChild;

    if (mediaElement?.classList.contains('unsupported-content')) {
      return <UnsupportedContent content={contentValue.value} />;
    }

    if (mediaElement?.classList.contains('error-content')) {
      return <ErrorContent content={contentValue.value} />;
    }

    const src =
      mediaElement?.querySelector('img, video, audio')?.getAttribute('src') ??
      undefined;
    const path =
      mediaElement?.querySelector('.text-xs')?.textContent ?? undefined;

    if (contentValue.value.includes('<video')) {
      return <VideoRenderer src={src} path={path} {...props} />;
    }

    if (contentValue.value.includes('<audio')) {
      return <AudioRenderer src={src} path={path} {...props} />;
    }

    if (contentValue.value.includes('<img')) {
      return <ImageRenderer src={src} path={path} {...props} />;
    }
  }

  return <div class="text-gray-500">Invalid media content</div>;
});
