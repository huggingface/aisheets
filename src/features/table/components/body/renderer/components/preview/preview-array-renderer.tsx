import { component$ } from '@builder.io/qwik';
import type { PreviewProps } from '~/features/table/components/body/renderer/components/preview/type';

export const PreviewArrayRenderer = component$<PreviewProps>(({ value }) => {
  return (
    <div class="w-full h-full resize-none whitespace-pre-wrap break-words overflow-auto">
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
});
