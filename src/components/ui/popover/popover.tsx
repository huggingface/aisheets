import { component$, type PropsOf, Slot } from '@builder.io/qwik';
import { Popover as HeadlessPopover } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';

const Root = component$<PropsOf<typeof HeadlessPopover.Root>>(
  ({ ...props }) => {
    return (
      <HeadlessPopover.Root {...props}>
        <Slot />
      </HeadlessPopover.Root>
    );
  },
);

const Trigger = HeadlessPopover.Trigger;

const Panel = component$<PropsOf<typeof HeadlessPopover.Panel>>(
  ({ ...props }) => {
    return (
      <HeadlessPopover.Panel
        {...props}
        class={cn(
          'my-transition w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          'data-[open]:animate-in data-[closing]:animate-out data-[closing]:fade-out data-[open]:fade-in data-[closing]:zoom-out-95 data-[open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          props.class,
        )}
      >
        <Slot />
      </HeadlessPopover.Panel>
    );
  },
);

export const Popover = {
  Root,
  Trigger,
  Panel,
};
