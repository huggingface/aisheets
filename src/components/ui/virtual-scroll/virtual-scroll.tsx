import {
  $,
  Fragment,
  type HTMLAttributes,
  type QRL,
  type Signal,
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from '@builder.io/qwik';
import { isBrowser } from '@builder.io/qwik/build';
import {
  type VirtualItem,
  Virtualizer,
  elementScroll,
  observeElementOffset,
  observeElementRect,
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
            // On first render, if we don't have this check, it will update state twice in one cycle, causing an error.
            if (
              state.range?.startIndex !== ev.range?.startIndex ||
              state.range?.endIndex !== ev.range?.endIndex
            ) {
              state.range = ev.range!;
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
    data,
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
    data: Signal<unknown[]>;
    loadNextPage?: QRL<
      ({ rangeStart }: { rangeStart: number }) => Promise<void>
    >;
    itemRenderer: QRL<
      (
        item: VirtualItem,
        itemData: any,
        props: HTMLAttributes<HTMLElement>,
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

    useTask$(({ track }) => {
      if (!loadNextPage) return;
      track(() => virtualState.state.range);

      const indexToFetch = (virtualState.state.range?.endIndex ?? 0) + buffer;

      if (
        isBrowser &&
        indexToFetch < totalCount &&
        indexToFetch > data.value.length &&
        !loadingData.value
      ) {
        const rangeStart = Math.floor(indexToFetch / pageSize) * pageSize;
        loadingData.value = true;
        // Do this in a hanging promise rather than await so that we don't block the state from updating further
        loadNextPage({ rangeStart }).then(() => {
          loadingData.value = false;
        });
      }
    });

    useVisibleTask$(({ track }) => {
      track(scrollElement);

      if (!virtualState.value) {
        getVirtual(virtualState);
      }
    });

    const visibleRows = useSignal<VirtualItem[]>([]);
    useVisibleTask$(({ track }) => {
      track(() => virtualState.state.range);
      if (!virtualState.value) return;

      visibleRows.value = virtualState.value.getVirtualItems();
    });

    return (
      <Fragment>
        {visibleRows.value.map((item: VirtualItem) => {
          return itemRenderer(item, data.value[item.index], {
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
            <p>Total count: {totalCount}</p>
            <p>Loading?: {loadingData.value ? 'yes' : 'no'}</p>
            <p>
              visible range: {virtualState.state.range?.startIndex}-
              {virtualState.state.range?.endIndex}
            </p>
            <p>{virtualState.value?.getTotalSize()}</p>
          </div>
        ) : null}
      </Fragment>
    );
  },
);
