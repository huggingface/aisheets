import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';
import { processMediaContent } from '~/features/table/utils/binary-content';
import { isObjectType } from '~/features/utils/columns';

interface MediaRendererProps {
  src?: string;
  path?: string;
}

const VideoRenderer = component$<MediaRendererProps>(({ src }) => {
  return (
    <video controls playsInline class="w-full max-w-[600px]">
      <source src={src} />
      <track kind="captions" />
      Your browser does not support the video tag.
    </video>
  );
});

const AudioRenderer = component$<MediaRendererProps>(({ src }) => {
  return (
    <audio controls src={src} class="w-full max-w-[400px]">
      <track kind="captions" />
    </audio>
  );
});

const ImageRenderer = component$<MediaRendererProps>(({ src, path }) => {
  return (
    <div class="w-full h-[90px] flex flex-col items-center">
      <div class="flex items-center justify-center overflow-hidden">
        <img
          src={src}
          alt={path}
          class="w-full h-full object-contain rounded-sm"
        />
      </div>
    </div>
  );
});

const UnsupportedContent = component$<{ content: string }>(({ content }) => {
  return <div class="unsupported-content" dangerouslySetInnerHTML={content} />; //Add sandbox where to prevent script execution
});

const ErrorContent = component$<{ content: string }>(({ content }) => {
  return <div class="error-content" dangerouslySetInnerHTML={content} />; //Add sandbox where to prevent script execution
});

export const TableBlobRenderer = component$<CellProps>((props) => {
  const { cell, column } = props;
  const contentValue = useSignal<string | null>();

  useTask$(async ({ track }) => {
    track(() => cell.value);

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
