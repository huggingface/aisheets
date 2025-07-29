import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';

import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedKatex from 'marked-katex-extension';
import { CellActions } from '~/features/table/components/body/cell-actions';
import { TableSandbox } from '~/features/table/components/body/renderer/components/table-sandbox';

const preprocess = (html: string) => {
  return html.replace(/[^\S\r\n]+$/gm, '');
};
const postprocess = (html: string) => {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['embed', 'object'],
    ADD_ATTR: ['data', 'target'],
    ADD_URI_SAFE_ATTR: ['data'],
  });
};

marked.use(
  markedKatex({
    throwOnError: false,
  }),
);

marked.use(
  { hooks: { preprocess, postprocess } },
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

export const TableMarkDownRenderer = component$<CellProps>((props) => {
  const { cell } = props;
  const htmlContent = useSignal<string | null>(null);

  useVisibleTask$(async ({ track }) => {
    track(() => cell.value);

    DOMPurify.addHook('beforeSanitizeAttributes', (node) => {
      if (node instanceof SVGElement) {
        const width = node.getAttribute('width');
        const height = node.getAttribute('height');
        const viewBox = node.getAttribute('viewBox');
        if (!viewBox && width && height) {
          node.setAttribute('viewBox', `0 0 ${width} ${height}`);
        }
      }
      if (node instanceof HTMLAnchorElement) {
        node.setAttribute('target', '_blank');
      }
    });

    const html = await marked.parse(cell.value);

    htmlContent.value = html;
  });

  return (
    <div class="h-full flex flex-col justify-between">
      <CellActions cell={cell} />
      <TableSandbox content={htmlContent.value || ''} />
    </div>
  );
});
