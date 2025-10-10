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
              state.range?.startIndex !== eventRange?.startIndex ||
              state.range?.endIndex !== eventRange?.endIndex
            ) {
              // On first render, if we don't have this check, it will update state twice in one cycle, causing an error.
              state.range = eventRange;
            }
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
    loadedCount,
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
    loadedCount: Signal<number>;

    loadNextPage?: QRL<
      ({
        rangeStart,
        pageSize,
      }: {
        rangeStart: number;
        pageSize: number;
      }) => Promise<void>
    >;
    itemRenderer: QRL<
      (item: VirtualItem, props: HTMLAttributes<HTMLElement>) => any
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

      visibleRows.value = virtualState.value.getVirtualItems();
    });

    useTask$(({ track }) => {
      track(() => virtualState.state.range);

      if (!loadNextPage) return;
      if (loadingData.value) return;

      const indexToFetch = (virtualState.state.range?.endIndex ?? 0) + buffer;

      if (indexToFetch < totalCount && indexToFetch > loadedCount.value) {
        const rangeStart = loadedCount.value;
        loadingData.value = true;

        // Do this in a hanging promise rather than await so that we don't block the state from updating further
        loadNextPage({
          rangeStart,
          pageSize: pageSize + Math.max(buffer, overscan ?? 0),
        }).then(() => {
          loadingData.value = false;
        });
      }
    });
    // cleanup
    useVisibleTask$(() => {
      return () => {
        virtualState.value = undefined;
        measuredIndices.value.clear();
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
          return itemRenderer(item, {
            key: item.key.toString(),
            ref: (node) => {
              if (node?.isConnected && !measuredIndices.value.has(item.index)) {
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
          });
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
            <p>Loaded count {loadedCount.value}</p>
            <p>{virtualState.value?.getTotalSize()}</p>
          </div>
        ) : null}
      </Fragment>
    );
  },
);
