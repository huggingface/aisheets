import { component$, type PropsOf, Slot } from '@builder.io/qwik';
import { Label as HeadlessLabel } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';

type LabelProps = PropsOf<'label'>;

export const Label = component$<LabelProps>((props) => {
  return (
    <HeadlessLabel
      {...props}
      class={cn(
        'font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )}
    >
      <Slot />
    </HeadlessLabel>
  );
});
