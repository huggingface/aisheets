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
  look?: 'default' | 'ghost';
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
    look = 'default',
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
            '[&::-webkit-scrollbar-track]:bg-blue flex min-h-[60px] w-full rounded-md bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
            {
              'border border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm':
                look === 'default',
              'border-none outline-none': look === 'ghost',
            },
            props.class,
          )}
          id={textareaId}
        />
        {error && <div id={`${textareaId}-error`}>{error}</div>}
      </>
    );
  },
);
