import {
  $,
  type PropsOf,
  type Signal,
  Slot,
  component$,
  sync$,
  useContext,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
import { usePopover } from '@qwik-ui/headless';
import { TooltipContextId, type TriggerDataState } from './tooltip-context';

export const HTooltipTrigger = component$((props: PropsOf<'button'>) => {
  const context = useContext(TooltipContextId);

  const openTimeout = useSignal<number | undefined>();
  const closeTimeout = useSignal<number | undefined>();

  const { showPopover, hidePopover } = usePopover(context.localId);

  const clearTimeoutIfExists = $((timeoutRef: Signal<number | undefined>) => {
    if (timeoutRef.value) {
      window.clearTimeout(timeoutRef.value);
      timeoutRef.value = undefined;
    }
  });

  const setTooltipState = $(
    (
      open: boolean,
      state: TriggerDataState,
      timeoutRef: Signal<number | undefined>,
    ) => {
      context.state.value = state;

      if (context.delayDuration > 0) {
        timeoutRef.value = window.setTimeout(() => {
          context.state.value = open ? 'open' : 'closed';
        }, context.delayDuration);
      } else {
        context.state.value = open ? 'open' : 'closed';
      }
    },
  );

  const setTooltipOpen$ = $(() => {
    clearTimeoutIfExists(closeTimeout);
    showPopover();
    setTooltipState(true, 'opening', openTimeout);
  });

  const setTooltipClosed$ = $(() => {
    clearTimeoutIfExists(openTimeout);
    hidePopover();
    setTooltipState(false, 'closing', closeTimeout);
  });

  const preventDefaultSync$ = sync$((e: Event) => {
    e.preventDefault();
  });

  const handleKeyDown$ = $(async (e: KeyboardEvent) => {
    if (context.state.value === 'open' && e.key === 'Escape') {
      e.preventDefault();
      setTooltipClosed$();
    }
  });

  useTask$(({ track, cleanup }) => {
    track(() => context.state.value);

    if (isServer) return;

    if (context.state.value === 'open') {
      document.addEventListener('keydown', handleKeyDown$);

      cleanup(() => {
        document.removeEventListener('keydown', handleKeyDown$);
      });
    } else if (context.state.value === 'closed') {
      document.removeEventListener('keydown', handleKeyDown$);
    }

    // Cleanup function to ensure the event listener is removed
    cleanup(() => {
      document.removeEventListener('keydown', handleKeyDown$);
    });
  });

  return (
    <span
      ref={context.triggerRef as any}
      onMouseOver$={[preventDefaultSync$, setTooltipOpen$]}
      onMouseLeave$={setTooltipClosed$}
      onFocus$={setTooltipOpen$}
      onBlur$={setTooltipClosed$}
      onKeyDown$={handleKeyDown$}
      aria-describedby={context.localId}
      data-state={context.state.value}
      {...props}
    >
      <Slot />
    </span>
  );
});
