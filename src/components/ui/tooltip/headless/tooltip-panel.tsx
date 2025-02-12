import { type PropsOf, Slot, component$, useContext } from '@builder.io/qwik';

import { Popover } from '@qwik-ui/headless';
import { TooltipContextId } from './tooltip-context';

export type HTooltipPanelProps = PropsOf<typeof Popover.Panel>;

/**
 * HTooltipPanel is the panel component for the Tooltip.
 */
export const HTooltipPanel = component$((props: HTooltipPanelProps) => {
  const context = useContext(TooltipContextId);

  return (
    <Popover.Panel
      {...props}
      role="tooltip"
      onToggle$={(e) => context.onOpenChange$(e.newState)}
      id={context.localId}
    >
      <Slot />
    </Popover.Panel>
  );
});
