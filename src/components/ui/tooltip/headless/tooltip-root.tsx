import {
  $,
  type PropsOf,
  type QRL,
  type Signal,
  Slot,
  component$,
  useContextProvider,
  useId,
  useSignal,
} from '@builder.io/qwik';
import { Popover } from '~/components/ui/popover/popover';
import {
  type TooltipContext,
  TooltipContextId,
  type TriggerDataState,
} from './tooltip-context';

/**
 * TooltipRootProps defines the properties for the Tooltip Root component.
 */
export type TooltipRootProps = {
  /**
   * A value that determines whether the tooltip is open.
   */
  open?: boolean;

  /** A signal that controls the current open state (controlled). */
  'bind:open'?: Signal<boolean>;

  /**
   * QRL handler that runs when the tooltip opens or closes.
   * @param open The new state of the tooltip.
   */
  onOpenChange$?: QRL<(state: 'open' | 'closed') => void>;

  /**
   * A value that determines how long before the tooltip will
   * be opened once triggered in milliseconds.
   */
  delayDuration?: number;

  /**
   * The default position of the tooltip.
   */
  placement?: Parameters<typeof Popover.Root>['0']['floating'];

  id?: string;
} & {
  gutter?: number;
  flip?: boolean;
};

/**
 * TooltipProps combines TooltipRootProps and the properties of a div element.
 */
export type TooltipProps = TooltipRootProps & Exclude<PropsOf<'div'>, 'ref'>;

/**
 * HTooltipRoot is the root component for the Tooltip.
 */
export const HTooltipRoot = component$((props: TooltipProps) => {
  const {
    placement = 'top',
    id,
    gutter,
    delayDuration = 0,
    flip,
    onOpenChange$,
    ...rest
  } = props;

  const triggerRef = useSignal<HTMLSpanElement>();
  const tooltipState = useSignal<TriggerDataState>('closed');

  const localId = useId();
  const compId = id ?? localId;

  const context: TooltipContext = {
    compId,
    localId,
    triggerRef,
    delayDuration,
    state: tooltipState,
    onOpenChange$: $((e) => onOpenChange$?.(e)),
  };

  useContextProvider(TooltipContextId, context);

  return (
    <Popover.Root
      manual
      hover
      bind:anchor={triggerRef}
      floating={placement}
      id={localId}
      gutter={gutter}
      flip={flip}
    >
      <div id={localId} {...rest}>
        <Slot />
      </div>
    </Popover.Root>
  );
});
