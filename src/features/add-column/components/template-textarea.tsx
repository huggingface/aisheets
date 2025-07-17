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
  cursor: { position: number };
  variables: string[];
}

export const TemplateTextArea = component$<TemplateTextAreaProps>((props) => {
  const textarea = useSignal<HTMLTextAreaElement | undefined>();
  const bracketTrigger = useSignal<HTMLDivElement | undefined>();

  const popOverVisible = useSignal(false);

  const referenceVariables = useStore<Popover>({
    cursor: { position: 0 },
    variables: [],
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
      : lastClosingBracketIndex > lastOpeningBracketIndex &&
        lastOpeningBracketIndex !== -1;

    return {
      textBeforeCursor,
      textAfterCursor,
      isInMiddleOfBrackets,
      isRequestingVariable,
    };
  });

  const updateBracketsSelectorPosition = $((textarea: HTMLTextAreaElement) => {
    const getCursorYPosition = (textarea: HTMLTextAreaElement) => {
      const PADDING = 40;

      const selectionStart = textarea.selectionStart;

      const span = document.createElement('span');
      const style = window.getComputedStyle(textarea);

      span.style.whiteSpace = 'pre-wrap';
      span.style.wordWrap = 'break-word';
      span.style.visibility = 'hidden';
      span.style.position = 'absolute';
      span.style.zIndex = '-1';
      span.style.width = `${textarea.clientWidth}px`;
      span.style.font = style.font;
      span.style.padding = style.padding;
      span.style.lineHeight = style.lineHeight;

      span.textContent = textarea.value.substring(0, selectionStart);

      document.body.appendChild(span);
      const positionY = span.scrollHeight;
      document.body.removeChild(span);

      return positionY - PADDING - textarea.scrollTop;
    };

    const newPosition = getCursorYPosition(textarea);

    referenceVariables.cursor = {
      position: newPosition,
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

    nextTick(() => {
      popOverVisible.value = isRequestingVariable;
    });
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
  });

  useVisibleTask$(({ track }) => {
    track(props.variables);

    referenceVariables.variables = props.variables.value.map(
      (variable) => variable.name,
    );
  });

  useVisibleTask$(({ track }) => {
    track(props['bind:value']);

    if (referenceVariables.variables.length === 0) return;

    const matchedVariables = props.variables.value.filter((variable) =>
      props['bind:value'].value.includes(`{{${variable.name}}}`),
    );

    props.onSelectedVariables(matchedVariables);
  });

  useVisibleTask$(async ({ track }) => {
    track(props['bind:value']);

    if (textarea.value) {
      await updateBracketsSelectorPosition(textarea.value);
    }

    referenceVariables.variables = props.variables.value.map(
      (variable) => variable.name,
    );
  });

  useVisibleTask$(() => {
    if (textarea.value) {
      textarea.value.focus();
      const length = textarea.value.value.length;
      textarea.value.setSelectionRange(length, length);
    }
  });

  return (
    <div class="relative">
      <Textarea
        ref={textarea}
        look="ghost"
        class="p-4 w-full h-56 min-h-56 max-h-56 resize-none overflow-auto text-base rounded-sm pb-16 placeholder:text-neutral-500"
        placeholder={
          props.variables.value[0]
            ? `Translate into French: {{${props.variables.value[0].name}}}`
            : 'Generate a fictional short bio of a scientist with a focus on their area of expertise'
        }
        onInput$={(event) =>
          handleTextInput(event.target as HTMLTextAreaElement)
        }
        onClick$={(event) =>
          updateBracketsSelectorPosition(event.target as HTMLTextAreaElement)
        }
        value={props['bind:value'].value}
      />

      <Select.Root bind:open={popOverVisible} loop={true} class="h-0">
        <Select.Trigger
          ref={bracketTrigger}
          look="headless"
          hideIcon
          class={`z-50 px-6 absolute border border-neutral-300 bg-neutral-100 p-2 rounded shadow-lg ${referenceVariables.variables.length === 0 ? 'invisible' : ''}`}
          style={{
            left: '8px',
            top: `${referenceVariables.cursor.position}px`,
          }}
        >
          <LuBraces class="text-neutral" />
        </Select.Trigger>
        <Select.Popover floating="bottom-start" class="!w-48">
          {referenceVariables.variables.map((variable) => (
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
