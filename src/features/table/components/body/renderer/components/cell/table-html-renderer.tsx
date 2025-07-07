import { component$ } from '@builder.io/qwik';
import type { TableProps } from '~/features/table/components/body/renderer/components/cell/type';
import { PreviewSandbox } from '~/features/table/components/body/renderer/components/preview-sandbox';

export const TableHTMLRenderer = component$<TableProps>(({ cell }) => {
  const content = (cell.value || '').replace('```html', '').replace(/```/g, '');

  return <PreviewSandbox content={content} />;
});
