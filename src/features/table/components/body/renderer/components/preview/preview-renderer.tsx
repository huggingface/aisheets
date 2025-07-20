import { component$ } from '@builder.io/qwik';
import { PreviewArrayRenderer } from '~/features/table/components/body/renderer/components/preview/preview-array-renderer';
import { PreviewBlobRenderer } from '~/features/table/components/body/renderer/components/preview/preview-blob-renderer';
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
  const { cell, value } = props;

  if (hasBlobContent(cell.column)) {
    return <PreviewBlobRenderer {...props} />;
  }

  if (isObjectType(cell.column)) {
    return <PreviewObjectRenderer {...props} />;
  }

  if (isArrayType(cell.column)) {
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
