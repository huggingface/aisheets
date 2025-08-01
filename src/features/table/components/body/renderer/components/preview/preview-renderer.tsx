import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import { LuBrain } from '@qwikest/icons/lucide';
import { Accordion } from '~/components';
import { PreviewArrayRenderer } from '~/features/table/components/body/renderer/components/preview/preview-array-renderer';
import { PreviewBlobRenderer } from '~/features/table/components/body/renderer/components/preview/preview-blob-renderer';
import { PreviewHtmlRenderer } from '~/features/table/components/body/renderer/components/preview/preview-html-renderer';
import { PreviewMarkDownRenderer } from '~/features/table/components/body/renderer/components/preview/preview-markdown-renderer';
import { PreviewObjectRenderer } from '~/features/table/components/body/renderer/components/preview/preview-object-renderer';
import { PreviewRawRenderer } from '~/features/table/components/body/renderer/components/preview/preview-raw-renderer';
import type { PreviewProps } from '~/features/table/components/body/renderer/components/preview/type';
import {
  getThinking,
  hasBlobContent,
  isArrayType,
  isHTMLContent,
  isMarkDown,
  isObjectType,
  removeThinking,
} from '~/features/utils/columns';

export const PreviewRenderer = component$<PreviewProps>((props) => {
  const { cell, value } = props;
  const thinking = useSignal<string[]>([]);
  const newValue = useSignal(value);

  useTask$(({ track }) => {
    track(() => value);

    newValue.value = removeThinking(value);
    thinking.value = getThinking(value);
  });

  let Component = PreviewRawRenderer;

  if (hasBlobContent(cell.column)) {
    Component = PreviewBlobRenderer;
  } else if (isObjectType(cell.column)) {
    Component = PreviewObjectRenderer;
  } else if (isArrayType(cell.column)) {
    Component = PreviewArrayRenderer;
  } else if (isMarkDown(newValue.value)) {
    Component = PreviewMarkDownRenderer;
  } else if (isHTMLContent(newValue.value)) {
    Component = PreviewHtmlRenderer;
  }

  return (
    <div class="h-full flex flex-col overflow-y-auto gap-2">
      {thinking.value.length >= 1 ? (
        <Accordion.Root class="w-3/4 shrink-0">
          <Accordion.Item class="border border-neutral-300 rounded-md">
            <Accordion.Trigger
              header="h1"
              class="text-lg hover:no-underline h-12 hover:bg-neutral-200 p-2 rounded-md data-[open]:rounded-b-none duration-200"
            >
              <div class="flex items-center gap-2">
                <LuBrain class="p-2 rounded-sm bg-neutral-300 w-fit h-fit" />
                Reasoning
              </div>
            </Accordion.Trigger>
            <Accordion.Content>
              <ul class="pt-4 p-6 space-y-2">
                {thinking.value.map((t) => {
                  return <li key={t}>{t}</li>;
                })}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>
      ) : null}

      <div class="h-full w-full flex-shrink-0 overflow-hidden">
        <Component cell={cell} value={newValue.value} />
      </div>
    </div>
  );
});
