import { component$ } from '@builder.io/qwik';
import type { PreviewProps } from '~/features/table/components/body/renderer/components/preview/type';

export const PreviewObjectRenderer = component$<PreviewProps>(({ value }) => {
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
});
