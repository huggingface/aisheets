import { component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';

interface MediaRendererProps {
  src?: string;
  path?: string;
  isExpanded?: boolean;
}

export const VideoRenderer = component$<MediaRendererProps>(
  ({ src, path, isExpanded }) => {
    return (
      <div class="flex flex-col">
        {path && <div class="text-xs text-gray-500 mb-1">{path}</div>}
        <video
          controls
          playsInline
          style={{ width: '100%', maxWidth: isExpanded ? '100%' : '600px' }}
        >
          <source src={src} />
          <track kind="captions" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  },
);

export const AudioRenderer = component$<MediaRendererProps>(
  ({ src, path, isExpanded }) => {
    return (
      <div class="flex flex-col">
        {path && <div class="text-xs text-gray-500 mb-1">{path}</div>}
        <audio
          controls
          src={src}
          style={{ width: '100%', maxWidth: isExpanded ? '100%' : '400px' }}
        >
          <track kind="captions" />
        </audio>
      </div>
    );
  },
);

export const ImageRenderer = component$<MediaRendererProps>(
  ({ src, path, isExpanded }) => {
    return (
      <div class="flex flex-col">
        {path && <div class="text-xs text-gray-500 mb-1">{path}</div>}
        <div class="relative w-full h-full flex items-center justify-center">
          <img
            src={src}
            alt={path || ''}
            class={cn(
              'rounded-sm',
              isExpanded
                ? 'max-w-full h-auto'
                : 'max-w-full max-h-[80px] object-contain',
            )}
            style={{ width: 'auto' }}
          />
        </div>
      </div>
    );
  },
);

export const UnsupportedContent = component$<{ content: string }>(
  ({ content }) => {
    return (
      <div class="unsupported-content" dangerouslySetInnerHTML={content} />
    );
  },
);

export const ErrorContent = component$<{ content: string }>(({ content }) => {
  return <div class="error-content" dangerouslySetInnerHTML={content} />;
});
