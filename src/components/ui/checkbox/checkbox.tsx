import { $, type PropsOf, component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';

export const Checkbox = component$<PropsOf<'input'>>(
  ({ id, name, ['bind:checked']: checkedSig, checked, onInput$, ...props }) => {
    const inputId = id || name;
    return (
      <input
        type="checkbox"
        {...props}
        // workaround to support two way data-binding on the Input component (https://github.com/QwikDev/qwik/issues/3926)
        checked={checkedSig ? checkedSig.value : checked}
        onInput$={
          checkedSig ? $((_, el) => (checkedSig.value = el.checked)) : onInput$
        }
        data-checked={checked || checkedSig?.value || ''}
        class={cn(
          'peer h-4 w-4 shrink-0 border-primary text-primary accent-primary ring-offset-background focus:ring-ring focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )}
        id={inputId}
      />
    );
  },
);
