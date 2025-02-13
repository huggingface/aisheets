import { Slot, component$ } from '@builder.io/qwik';
import { HTooltipPanel } from '~/components/ui/tooltip/headless/tooltip-panel';
import { HTooltipRoot } from '~/components/ui/tooltip/headless/tooltip-root';
import { HTooltipTrigger } from '~/components/ui/tooltip/headless/tooltip-trigger';

export const Tooltip = component$<{ text: string }>(({ text }) => {
  return (
    <HTooltipRoot gutter={8} flip>
      <HTooltipTrigger>
        <Slot />
      </HTooltipTrigger>
      <HTooltipPanel class="text-white font-light px-3 py-1 rounded-sm text-sm bg-gray-900">
        {text}
      </HTooltipPanel>
    </HTooltipRoot>
  );
});
