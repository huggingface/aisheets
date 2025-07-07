import { component$ } from '@builder.io/qwik';
import { TableBlobRenderer } from '~/features/table/components/body/renderer/components/cell/table-blob-renderer';
import { PreviewArrayRenderer } from '~/features/table/components/body/renderer/components/preview/preview-array-renderer';
import { PreviewHtmlRenderer } from '~/features/table/components/body/renderer/components/preview/preview-html-renderer';
import { PreviewMarkDownRenderer } from '~/features/table/components/body/renderer/components/preview/preview-markdown-renderer';
import { PreviewObjectRenderer } from '~/features/table/components/body/renderer/components/preview/preview-object-renderer';
import { PreviewRawRenderer } from '~/features/table/components/body/renderer/components/preview/preview-raw-renderer';
import type { PreviewProps } from '~/features/table/components/body/renderer/components/preview/type';
import {
  hasBlobContent,
  isArrayType,
  isHTMLContent,
  isMarkDown,
  isObjectType,
} from '~/features/utils/columns';

export const PreviewRenderer = component$<PreviewProps>((props) => {
  const { column, value } = props;

  if (!column) {
    return null;
  }

  if (hasBlobContent(column)) {
    return <TableBlobRenderer {...props} />;
  }

  if (isObjectType(column)) {
    return <PreviewObjectRenderer {...props} />;
  }

  if (isArrayType(column)) {
    return <PreviewArrayRenderer {...props} />;
  }

  if (isMarkDown(value)) {
    return <PreviewMarkDownRenderer {...props} />;
  }

  if (isHTMLContent(value)) {
    return <PreviewHtmlRenderer {...props} />;
  }

  return <PreviewRawRenderer {...props} />;
});
