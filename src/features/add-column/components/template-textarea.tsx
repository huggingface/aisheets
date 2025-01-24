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

interface Variable {
  id: string;
  name: string;
}

interface TemplateTextAreaProps {
  ['bind:value']: Signal<string>;
  variables: Variable[];
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
  const inputValue = useSignal('');
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
        Number.parseInt(
          getComputedStyle(textarea.value).lineHeight || '20',
          10,
        ) +
        verticalPadding +
        window.scrollY;

      popover.position.y = popover.lineHeight;
    }

    popover.options = props.variables.map((variable) => variable.name);
  });

  useVisibleTask$(({ track }) => {
    track(inputValue);

    props['bind:value'].value = inputValue.value;

    if (popover.options.length === 0) return;

    const matchedVariables = props.variables.filter((variable) =>
      inputValue.value.includes(`{{${variable.name}}}`),
    );

    props.onSelectedVariables(matchedVariables);
  });

  const getCursorPosition = $((textarea: HTMLTextAreaElement) => {
    const cursorPosition = textarea.selectionStart || 0;
    const textBeforeCursor = inputValue.value.slice(0, cursorPosition);
    const textAfterCursor = inputValue.value.slice(cursorPosition);

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
    inputValue.value = textarea.value;

    const {
      isInMiddleOfBrackets,
      isRequestingVariable,
      textBeforeCursor,
      textAfterCursor,
    } = await getCursorPosition(textarea);

    if (isInMiddleOfBrackets) {
      const removedInconsistentBrackets =
        textBeforeCursor.slice(0, -2) + textAfterCursor;

      textarea.value = inputValue.value = removedInconsistentBrackets;
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

    inputValue.value = updatedValue;

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
          bind:value={inputValue}
        />
      )}
      {popover.options.length > 0 && (
        <>
          <Textarea
            ref={textarea}
            class="w-full h-40 p-2 border border-gray-300 rounded"
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
              handleTextInput(event.target as HTMLTextAreaElement)
            }
            value={inputValue.value}
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
