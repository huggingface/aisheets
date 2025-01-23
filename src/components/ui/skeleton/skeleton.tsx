import { component$, type PropsOf } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';

export const Skeleton = component$<PropsOf<'div'>>(({ ...props }) => {
  return (
    <div
      {...props}
      class={cn('animate-pulse rounded bg-foreground/10', props.class)}
    />
  );
});
