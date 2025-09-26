import { component$, type PropsOf, Slot } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import type { Popover } from '~/components/ui/popover/popover';
import { HTooltipPanel } from '~/components/ui/tooltip/headless/tooltip-panel';
import { HTooltipRoot } from '~/components/ui/tooltip/headless/tooltip-root';
import { HTooltipTrigger } from '~/components/ui/tooltip/headless/tooltip-trigger';

type TooltipProps = {
  open?: boolean;
  text: string;
  floating?: Parameters<typeof Popover.Root>['0']['floating'];
  gutter?: number;
} & PropsOf<'div'>;

export const Tooltip = component$<TooltipProps>(
  ({ text, floating, gutter = 8, open = false, ...props }) => {
    const { class: className, ...rest } = props;
    return (
      <HTooltipRoot
        gutter={gutter}
        flip
        placement={floating}
        open={open}
        {...rest}
      >
        <HTooltipTrigger>
          <Slot />
        </HTooltipTrigger>
        <HTooltipPanel
          class={cn(
            'text-white font-light px-3 py-1 rounded-sm text-sm bg-gray-900',
            className,
          )}
        >
          {text}
        </HTooltipPanel>
      </HTooltipRoot>
    );
  },
);
