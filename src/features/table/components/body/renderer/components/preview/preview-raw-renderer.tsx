import { component$ } from '@builder.io/qwik';
import type { PreviewProps } from '~/features/table/components/body/renderer/components/preview/type';

export const PreviewRawRenderer = component$<PreviewProps>(({ value }) => {
  return (
    <div class="w-full h-full text-base resize-none whitespace-pre-wrap break-words overflow-auto p-1 py-2">
      <p>{value?.toString()}</p>
    </div>
  );
});
