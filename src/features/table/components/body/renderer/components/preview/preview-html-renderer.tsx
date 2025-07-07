import { component$ } from '@builder.io/qwik';
import type { PreviewProps } from '~/features/table/components/body/renderer/components/preview/type';
import { Sandbox } from '~/features/table/components/body/renderer/components/sandbox';

export const PreviewHtmlRenderer = component$<PreviewProps>(({ value }) => {
  const content = value.replace('```html', '').replace(/```/g, '');

  return <Sandbox content={content} />;
});
