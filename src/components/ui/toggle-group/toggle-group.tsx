import {
  type PropsOf,
  Slot,
  component$,
  useContextProvider,
} from '@builder.io/qwik';
import { ToggleGroup as HeadlessToggleGroup } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';

import { type VariantProps, cva } from 'class-variance-authority';

import { createContextId } from '@builder.io/qwik';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-[pressed=true]:bg-primary aria-[pressed=true]:text-primary-foreground',
  {
    variants: {
      look: {
        default: 'border border-input bg-transparent',
        outline:
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-transparent hover:bg-neutral-400 hover:text-secondary-foreground aria-[pressed=true]:bg-neutral-300 text-primary-600 rounded-sm p-2',
      },

      size: {
        default: 'h-10 px-3',
        sm: 'h-9 px-2.5',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      look: 'default',
      size: 'default',
    },
  },
);

export const toggleGroupStyledContextId =
  createContextId<ToggleGroupStyledContext>('qui-toggle-group-styled');

export type ToggleGroupStyledContext = VariantProps<typeof toggleVariants>;

type ToggleGroupRootProps = PropsOf<typeof HeadlessToggleGroup.Root> &
  VariantProps<typeof toggleVariants>;

const Root = component$<ToggleGroupRootProps>(({ size, look, ...props }) => {
  const contextStyled: ToggleGroupStyledContext = {
    size,
    look,
  };
  useContextProvider(toggleGroupStyledContextId, contextStyled);

  return (
    <HeadlessToggleGroup.Root
      {...props}
      class={cn('flex items-center gap-1', props.class)}
    >
      <Slot />
    </HeadlessToggleGroup.Root>
  );
});

type ToggleGroupItemProps = PropsOf<typeof HeadlessToggleGroup.Item> &
  VariantProps<typeof toggleVariants>;

const Item = component$<ToggleGroupItemProps>(({ ...props }) => {
  const { look, size } = props;

  return (
    <HeadlessToggleGroup.Item
      {...props}
      class={cn(toggleVariants({ size, look }), props.class)}
    >
      <Slot />
    </HeadlessToggleGroup.Item>
  );
});

export const ToggleGroup = {
  Root,
  Item,
};
