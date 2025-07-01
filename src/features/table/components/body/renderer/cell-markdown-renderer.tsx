import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { CellProps } from '~/features/table/components/body/renderer/cell-props';

import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import markedKatex from 'marked-katex-extension';
import { ToggleGroup } from '~/components';
import {
  PreviewSandbox,
  Sandbox,
} from '~/features/table/components/body/renderer/cell-html-renderer';
import { CellRawEditor } from '~/features/table/components/body/renderer/cell-raw-renderer';

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

export const CellMarkDownRenderer = component$<CellProps>((props) => {
  const { cell } = props;
  const mode = useSignal('preview');
  const isExpanded = useSignal(false);
  const htmlContent = useSignal<string | null>(null);

  useVisibleTask$(async () => {
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
    <div
      stoppropagation:click
      stoppropagation:dblclick
      class="w-full h-full"
      onDblClick$={() => {
        isExpanded.value = true;
      }}
      onClick$={() => {
        isExpanded.value = false;
      }}
    >
      <div class="h-full flex flex-col justify-between">
        <PreviewSandbox content={htmlContent.value || ''} />
      </div>

      {isExpanded.value && (
        <>
          <div class="fixed inset-0 bg-neutral-700/40 z-50" />

          <div
            class="fixed z-[101] bg-white border border-neutral-500 w-full h-full max-w-full max-h-[40vh] md:max-w-[800px] md:max-h-[600px] overflow-hidden"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div class="flex items-center justify-center w-full h-full p-4 bg-neutral-50">
              <div class="absolute top-1 right-6 flex items-center justify-end w-full h-5">
                <ToggleGroup.Root bind:value={mode}>
                  <ToggleGroup.Item
                    stoppropagation:click
                    value="raw"
                    look="outline"
                    class="h-5"
                  >
                    Raw
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    class="h-5"
                    stoppropagation:click
                    value="preview"
                    look="outline"
                  >
                    Preview
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>
              {mode.value === 'raw' ? (
                <CellRawEditor isEditing={isExpanded} {...props} />
              ) : (
                <Sandbox content={htmlContent.value || ''} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
