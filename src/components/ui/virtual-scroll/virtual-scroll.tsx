import {
  $,
  component$,
  Fragment,
  type HTMLAttributes,
  type QRL,
  type Signal,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';

import {
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualItem,
  Virtualizer,
} from '@tanstack/virtual-core';
import { nextTick } from '~/components/hooks/tick';
import { makeSerializable } from './make-serializable';

const { getSerializable: getVirtual, useSerializable: useVirtualScroll } =
  makeSerializable(
    $(
      (state: {
        scrollElement: Signal<HTMLElement | undefined>;
        scrollOffset: number;
        range?: { startIndex: number; endIndex: number };
        totalCount: number;
        estimateSize: number;
        overscan?: number;
        debug?: boolean;
      }) => {
        const virtualizer = new Virtualizer({
          initialRect: state.scrollElement.value!.getBoundingClientRect(),
          debug: state.debug,
          count: state.totalCount,
          estimateSize: () => state.estimateSize,
          overscan: state.overscan,
          getScrollElement: () => state.scrollElement.value ?? null,
          scrollToFn: elementScroll,
          observeElementRect: observeElementRect,
          observeElementOffset: observeElementOffset,
          measureElement:
            typeof window !== 'undefined' &&
            navigator.userAgent.indexOf('Firefox') === -1
              ? (element) => element?.getBoundingClientRect().height
              : undefined,
          onChange: (ev) => {
            ev._willUpdate();
            const eventRange = ev.range!;

            if (
              state.range?.startIndex !== eventRange.startIndex ||
              state.range?.endIndex !== eventRange.endIndex
            ) {
              state.range = eventRange;
            }

            state.range = eventRange;
            state.scrollOffset = ev.scrollOffset!;
          },
        });

        virtualizer._didMount();
        virtualizer._willUpdate();
        return virtualizer;
      },
    ),
  );

export const VirtualScrollContainer = component$(
  ({
    totalCount,
    currentRange,
    loadNextPage,
    itemRenderer,
    scrollElement,
    estimateSize,
    overscan,
    pageSize = 10,
    buffer = 3,
    debug = false,
  }: {
    totalCount: number;
    currentRange: Signal<{ start: number; end: number }>;

    loadNextPage?: QRL<
      ({ start, end }: { start: number; end: number }) => Promise<void>
    >;
    itemRenderer: QRL<
      (
        item: VirtualItem,
        props: HTMLAttributes<HTMLElement>,
        isLoading: boolean,
      ) => any
    >;
    estimateSize: number;
    overscan?: number;
    pageSize?: number;
    buffer?: number;
    scrollElement: Signal<HTMLElement | undefined>;
    debug?: boolean;
  }) => {
    if (!scrollElement.value) {
      throw new Error('scrollElement is required');
    }

    const measuredIndices = useSignal(new Set<number>());
    const loadingData = useSignal(false);
    const virtualState = useVirtualScroll({
      debug,
      scrollElement,
      scrollOffset: 0,
      totalCount,
      estimateSize,
      overscan,
    });

    const visibleRows = useSignal<VirtualItem[]>([]);
    useVisibleTask$(({ track }) => {
      track(() => virtualState.state.range);
      if (!virtualState.value) return;

      const allVirtualItems = virtualState.value.getVirtualItems();

      visibleRows.value = allVirtualItems.filter((v) => {
        // Return only those items in the doubled range, plus always the last item
        return (
          (v.index >= (virtualState.state.range?.startIndex ?? 0) - buffer &&
            v.index <= (virtualState.state.range?.endIndex ?? 0) + buffer) ||
          // Always include the last item to avoid empty space at the end
          v.index === totalCount - 1
        );
      });
    });

    useTask$(({ track }) => {
      track(() => virtualState.state.range);
      track(visibleRows);

      if (!loadNextPage) return;

      const { startIndex, endIndex } = virtualState.state.range || {};
      if (startIndex === undefined || endIndex === undefined) return;

      const { start, end } = currentRange.value;

      // Keep a window of 2*pageSize around the middle of the visible range
      const middle = Math.floor((startIndex + endIndex) / 2);
      const newStart = Math.max(0, middle - pageSize);
      const newEnd = Math.min(totalCount, middle + pageSize);

      if (
        Math.max(0, visibleRows.value?.[0]?.index) >= start &&
        end > visibleRows.value?.slice(-1)[0]?.index
      ) {
        return;
      }

      loadingData.value = true;
      loadNextPage({
        start: newStart,
        end: newEnd,
      }).then(() => {
        loadingData.value = false;
      });
    });
    // cleanup
    useVisibleTask$(() => {
      return () => {
        virtualState.value = undefined;
        measuredIndices.value.clear();
        loadingData.value = false;
      };
    });

    useVisibleTask$(({ track }) => {
      track(scrollElement);

      if (!virtualState.value) {
        getVirtual(virtualState);
      }
    });

    return (
      <Fragment>
        {visibleRows.value.map((item: VirtualItem) => {
          return itemRenderer(
            item,
            {
              key: item.key.toString(),
              ref: (node) => {
                if (
                  node?.isConnected &&
                  !measuredIndices.value.has(item.index)
                ) {
                  measuredIndices.value.add(item.index);
                  node.setAttribute('data-index', item.index.toString());
                  nextTick(() => {
                    virtualState.value?.measureElement?.(node);
                  });
                }
              },
              style: {
                display: 'flex',
                position: 'absolute',
                top: `${item.start}px`,
                width: '100%',
              },
            },
            loadingData.value,
          );
        })}
        {debug ? (
          <div class="fixed z-30 right-0 px-10 bg-white">
            <p> Number of visible rows {visibleRows.value.length}</p>
            <p>Total count: {totalCount}</p>
            <p>Loading?: {loadingData.value ? 'yes' : 'no'}</p>
            <p>
              visible range: {virtualState.state.range?.startIndex}-
              {virtualState.state.range?.endIndex}
            </p>
            <p>
              Current range: {currentRange.value.start}-{currentRange.value.end}
            </p>
            <p>{virtualState.value?.getTotalSize()}</p>
          </div>
        ) : null}
      </Fragment>
    );
  },
);
