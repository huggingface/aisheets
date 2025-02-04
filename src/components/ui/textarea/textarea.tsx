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

    return (
      <>
        <textarea
          {...props}
          value={valueSig ? valueSig.value : value}
          onKeyDown$={$((e) => {
            if (preventEnterNewline && e.key === 'Enter' && !e.shiftKey) {
              lastKeyWasEnter.value = true;
            }
            props.onKeyDown$?.(e);
          })}
          onInput$={$((e, el) => {
            const newValue = el.value;
            if (preventEnterNewline && lastKeyWasEnter.value) {
              lastKeyWasEnter.value = false;
              el.value = valueSig?.value || value;
              return;
            }
            if (valueSig) {
              valueSig.value = newValue;
            }
            onInput$?.(e, el);
          })}
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
