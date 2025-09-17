import { component$ } from '@builder.io/qwik';
import type { PreviewProps } from '~/features/table/components/body/renderer/components/preview/type';
import { bigIntStringify } from '~/usecases/utils/serializer';

export const PreviewArrayRenderer = component$<PreviewProps>(({ value }) => {
  const content = JSON.stringify(value, bigIntStringify, 2);
  return (
    <div class="w-full h-full resize-none whitespace-pre-wrap break-words overflow-auto">
      <pre>{content}</pre>
    </div>
  );
});
