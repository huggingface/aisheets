import { type PropsOf, Slot, component$ } from '@builder.io/qwik';
import { HTooltipPanel } from '~/components/ui/tooltip/headless/tooltip-panel';
import { HTooltipRoot } from '~/components/ui/tooltip/headless/tooltip-root';
import { HTooltipTrigger } from '~/components/ui/tooltip/headless/tooltip-trigger';

type TooltipProps = {
  text: string;
} & PropsOf<'div'>;

export const Tooltip = component$<TooltipProps>(({ text, ...props }) => {
  return (
    <HTooltipRoot gutter={8} flip>
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
});
