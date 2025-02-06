import {
  $,
  type PropsOf,
  component$,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';

type TextareaProps = PropsOf<'textarea'> & {
  error?: string;
  preventEnterNewline?: boolean;
};

export const Textarea = component$<TextareaProps>(
  ({
    id,
    name,
    error,
    ['bind:value']: valueSig,
    value,
    onInput$,
    preventEnterNewline,
    ...props
  }) => {
    const textareaId = id || name;
    const lastKeyWasEnter = useSignal(false);

    useTask$(({ track }) => {
      track(() => valueSig?.value);
      lastKeyWasEnter.value = false;
    });

    const handleKeyDown = $((e: KeyboardEvent, el: HTMLTextAreaElement) => {
      if (preventEnterNewline && e.key === 'Enter' && !e.shiftKey) {
        lastKeyWasEnter.value = true;
      }

      if (typeof props.onKeyDown$ === 'function') {
        props.onKeyDown$?.(e, el);
      }
    });

    const handleOnInput = $((e: InputEvent, el: HTMLTextAreaElement) => {
      const newValue = el.value;
      if (preventEnterNewline && lastKeyWasEnter.value) {
        lastKeyWasEnter.value = false;
        el.value = valueSig?.value || (value as string);

        return;
      }
      if (valueSig) {
        valueSig.value = newValue;
      }
      if (typeof onInput$ === 'function') {
        onInput$?.(e, el);
      }
    });

    return (
      <>
        <textarea
          {...props}
          value={valueSig ? valueSig.value : value}
          onKeyDown$={handleKeyDown}
          onInput$={handleOnInput}
          class={cn(
            '[&::-webkit-scrollbar-track]:bg-blue flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            props.class,
          )}
          id={textareaId}
        />
        {error && <div id={`${textareaId}-error`}>{error}</div>}
      </>
    );
  },
);
