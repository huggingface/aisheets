import {
  $,
  type QRL,
  type Signal,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from '@builder.io/qwik';
import { TbBraces } from '@qwikest/icons/tablericons';
import { Select, Textarea } from '~/components';
import { nextTick } from '~/components/hooks/tick';

export interface Variable {
  id: string;
  name: string;
}

interface TemplateTextAreaProps {
  ['bind:value']: Signal<string>;
  variables: Signal<Variable[]>;
  onSelectedVariables: QRL<(variables: Variable[]) => void>;
}

interface Popover {
  position: { x: number; y: number };
  options: string[];
  lineHeight: number;
}

export const TemplateTextArea = component$<TemplateTextAreaProps>((props) => {
  const textarea = useSignal<HTMLTextAreaElement | undefined>();
  const firstOption = useSignal<HTMLDivElement | undefined>();
  const popOverVisible = useSignal(false);

  const popover = useStore<Popover>({
    position: { x: 0, y: 0 },
    options: [],
    lineHeight: 0,
  });

  useVisibleTask$(() => {
    if (textarea.value) {
      const verticalPadding = 10;
      popover.lineHeight =
        Number.parseInt(getComputedStyle(textarea.value).lineHeight || '20') +
        verticalPadding;

      popover.position = {
        x: 0,
        y: popover.lineHeight,
      };

      nextTick(() => {
        textarea.value!.focus();
      }, 100);
    }

    popover.options = props.variables.value.map((variable) => variable.name);
  });

  useVisibleTask$(({ track }) => {
    track(props.variables);

    popover.options = props.variables.value.map((variable) => variable.name);
  });

  useVisibleTask$(({ track }) => {
    track(props['bind:value']);

    if (popover.options.length === 0) return;

    const matchedVariables = props.variables.value.filter((variable) =>
      props['bind:value'].value.includes(`{{${variable.name}}}`),
    );

    props.onSelectedVariables(matchedVariables);
  });

  const getCursorPosition = $((textarea: HTMLTextAreaElement) => {
    const cursorPosition = textarea.selectionStart || 0;
    const textBeforeCursor = props['bind:value'].value.slice(0, cursorPosition);
    const textAfterCursor = props['bind:value'].value.slice(cursorPosition);

    const lastOpeningBracketIndex = textBeforeCursor.lastIndexOf('{{');
    const lastClosingBracketIndex = textAfterCursor.lastIndexOf('}}');

    const isRequestingVariable = textBeforeCursor.endsWith('{{');

    const isInMiddleOfBrackets = isRequestingVariable
      ? lastOpeningBracketIndex > lastClosingBracketIndex &&
        lastClosingBracketIndex !== -1
      : lastClosingBracketIndex > lastOpeningBracketIndex;

    return {
      textBeforeCursor,
      textAfterCursor,
      isInMiddleOfBrackets,
      isRequestingVariable,
    };
  });

  const updateBracketsSelectorPosition = $((textarea: HTMLTextAreaElement) => {
    const { selectionStart } = textarea;
    const textBeforeCursor = textarea.value.slice(0, selectionStart || 0);
    const lines = textBeforeCursor.split('\n');

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      const style = getComputedStyle(textarea);
      context.font = `${style.fontSize} ${style.fontFamily}`;
    }

    const measureTextWidth = (text: string) => {
      const characterWidthAprox = 7;

      return context
        ? context.measureText(text).width
        : text.length * characterWidthAprox;
    };

    const charOffset = measureTextWidth(lines[lines.length - 1]);
    const verticalAlignPerLines = lines.length - 1 || 1;

    const position = {
      x: charOffset,
      y: verticalAlignPerLines * popover.lineHeight,
    };

    popover.position = {
      x: position.x,
      y: position.y,
    };
  });

  const handleTextInput = $(async (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;

    props['bind:value'].value = textarea.value;

    const {
      isInMiddleOfBrackets,
      isRequestingVariable,
      textBeforeCursor,
      textAfterCursor,
    } = await getCursorPosition(textarea);

    if (isInMiddleOfBrackets && isRequestingVariable) {
      const removedInconsistentBrackets =
        textBeforeCursor.slice(0, -2) + textAfterCursor;

      textarea.value = props['bind:value'].value = removedInconsistentBrackets;
      return;
    }

    await updateBracketsSelectorPosition(textarea);

    if (isRequestingVariable) {
      firstOption.value?.focus();
      firstOption.value?.click();
    } else {
      popOverVisible.value = false;
    }
  });

  const handleOptionClick = $(async (options: string) => {
    textarea.value?.focus();
    popOverVisible.value = false;

    const { textBeforeCursor, textAfterCursor, isInMiddleOfBrackets } =
      await getCursorPosition(textarea.value!);

    if (isInMiddleOfBrackets) return;

    const updatedValue =
      (textBeforeCursor.endsWith('{{')
        ? textBeforeCursor.replace(/\{\{[^}]*$/, `{{${options}}}`)
        : textBeforeCursor + `{{${options}}}`) + textAfterCursor;

    props['bind:value'].value = updatedValue;

    nextTick(() => {
      handleTextInput(textarea.value!);
    });
  });

  return (
    <div class="relative">
      {popover.options.length === 0 && (
        <Textarea
          ref={textarea}
          class="w-full h-40 p-2 border border-gray-300 rounded"
          bind:value={props['bind:value']}
        />
      )}
      {popover.options.length > 0 && (
        <>
          <div
            class="absolute top-0 left-0 w-full h-full whitespace-pre-wrap break-words text-transparent pointer-events-none overflow-hidden text-base p-2"
            aria-hidden="true"
          >
            <Highlights
              text={props['bind:value'].value}
              variables={popover.options}
            />
          </div>

          <Textarea
            ref={textarea}
            class="w-full h-full min-h-40 resize-none overflow-hidden p-2 border border-gray-300 text-base"
            onInput$={(event) =>
              handleTextInput(event.target as HTMLTextAreaElement)
            }
            onKeyDown$={(event: KeyboardEvent) => {
              if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                updateBracketsSelectorPosition(
                  event.target as HTMLTextAreaElement,
                );
              }
            }}
            onClick$={(event) =>
              updateBracketsSelectorPosition(
                event.target as HTMLTextAreaElement,
              )
            }
            value={props['bind:value'].value}
          />

          <Select.Root bind:open={popOverVisible} loop={true} autoFocus={true}>
            <Select.Trigger
              ref={firstOption}
              look="headless"
              hideIcon
              class="absolute bg-white border border-gray-300 p-2 rounded shadow-lg focus:outline-none"
              style={{
                left: `${popover.position.x + 20}px`,
                top: `${popover.position.y}px`,
              }}
            >
              <TbBraces />
            </Select.Trigger>
            <Select.Popover>
              {popover.options.map((variable) => (
                <Select.Item
                  key={variable}
                  onClick$={() => handleOptionClick(variable)}
                  onKeyDown$={(event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                      handleOptionClick(variable);
                    }
                  }}
                >
                  <Select.ItemLabel>{variable}</Select.ItemLabel>
                </Select.Item>
              ))}
            </Select.Popover>
          </Select.Root>
        </>
      )}
    </div>
  );
});

export const Highlights = component$<{
  text: string;
  variables: string[];
}>(({ text, variables }) => {
  const highlightWords = variables.map((variable) => `{{${variable}}}`);
  const escapedWords = highlightWords.map((word) =>
    word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part) =>
    regex.test(part) ? (
      <span
        key={part}
        class="bg-gray-300 bg-opacity-60 pb-1 pr-[1px] rounded-[4px]"
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
});
