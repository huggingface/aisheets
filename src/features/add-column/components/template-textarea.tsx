import {
  $,
  type QRL,
  type Signal,
  component$,
  useSignal,
  useStore,
  useVisibleTask$,
} from '@builder.io/qwik';
import { LuBraces } from '@qwikest/icons/lucide';
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
    const verticalPadding = 10;

    const { selectionStart } = textarea;
    const style = getComputedStyle(textarea);

    const textBeforeCursor = textarea.value.slice(0, selectionStart || 0);
    const lines = textBeforeCursor.split('\n');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (context) {
      context.font = `${style.fontSize} ${style.fontFamily}`;
    }

    const measureTextWidth = (text: string) => {
      const characterWidthAprox = 7;

      return context
        ? context.measureText(text).width
        : text.length * characterWidthAprox;
    };

    const charOffset = measureTextWidth(lines[lines.length - 1]);
    const verticalAlignPerLines = lines.length - 1 || 0.5;
    popover.lineHeight = Number.parseInt(style.lineHeight) + verticalPadding;

    const position = {
      x: charOffset + 20,
      y:
        Math.round(verticalAlignPerLines * 0.72 * popover.lineHeight * 10) / 10,
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

  useVisibleTask$(async ({ track }) => {
    track(props['bind:value']);

    if (textarea.value) {
      await updateBracketsSelectorPosition(textarea.value!);
    }

    popover.options = props.variables.value.map((variable) => variable.name);
  });

  return (
    <div class="relative">
      {popover.options.length > 0 && (
        <div
          class="p-4 absolute top-0 left-0 w-full h-full whitespace-pre-wrap break-words text-transparent pointer-events-none overflow-hidden text-base"
          aria-hidden="true"
        >
          <Highlights
            text={props['bind:value'].value}
            variables={popover.options}
          />
        </div>
      )}

      <Textarea
        ref={textarea}
        class="p-4 w-full h-full min-h-72 resize-none overflow-hidden border border-neutral-300-foreground bg-white text-base rounded-sm pb-16"
        onInput$={(event) =>
          handleTextInput(event.target as HTMLTextAreaElement)
        }
        onKeyDown$={(event: KeyboardEvent) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            updateBracketsSelectorPosition(event.target as HTMLTextAreaElement);
          }
        }}
        onClick$={(event) =>
          updateBracketsSelectorPosition(event.target as HTMLTextAreaElement)
        }
        value={props['bind:value'].value}
      />

      <Select.Root bind:open={popOverVisible} loop={true} autoFocus={true}>
        <Select.Trigger
          ref={firstOption}
          look="headless"
          hideIcon
          class={`px-6 absolute border border-neutral-300 bg-neutral-100 p-2 rounded shadow-lg ${popover.options.length === 0 ? 'invisible' : ''}`}
          style={{
            left: `${popover.position.x}px`,
            top: `${popover.position.y}px`,
          }}
        >
          <LuBraces class="text-neutral" />
        </Select.Trigger>
        <Select.Popover floating="bottom-start" class="!w-48">
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
