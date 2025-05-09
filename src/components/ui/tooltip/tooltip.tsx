import { type PropsOf, Slot, component$ } from '@builder.io/qwik';
import type { Popover } from '~/components/ui/popover/popover';
import { HTooltipPanel } from '~/components/ui/tooltip/headless/tooltip-panel';
import { HTooltipRoot } from '~/components/ui/tooltip/headless/tooltip-root';
import { HTooltipTrigger } from '~/components/ui/tooltip/headless/tooltip-trigger';

type TooltipProps = {
  text: string;
  floating?: Parameters<typeof Popover.Root>['0']['floating'];
  gutter?: number;
} & PropsOf<'div'>;

export const Tooltip = component$<TooltipProps>(
  ({ text, floating, gutter = 8, ...props }) => {
    return (
      <HTooltipRoot gutter={gutter} flip placement={floating}>
        <HTooltipTrigger>
          <Slot />
        </HTooltipTrigger>
        <HTooltipPanel
          class={`text-white font-light px-3 py-1 rounded-sm text-sm bg-gray-900 ${props.class}`}
        >
          {text}
        </HTooltipPanel>
      </HTooltipRoot>
    );
  },
);
