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
        overscan: number;
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
    initialData,
    getNextPage,
    itemRenderer,
    scrollElement,
    estimateSize,
    overscan,
    pageSize = 10,
    buffer = 3,
    debug = false,
  }: {
    initialData: Signal<{
      startIndex: number;
      elements: any;
      totalCount: number;
    }>;
    getNextPage: QRL<
      ({
        rangeStart,
      }: {
        rangeStart: number;
      }) => Promise<{ startIndex: number; elements: any; totalCount: number }>
    >;
    itemRenderer: QRL<
      (
        item: VirtualItem,
        itemData: any,
        props: HTMLAttributes<HTMLElement>,
      ) => any
    >;
    estimateSize: number;
    overscan: number;
    pageSize: number;
    buffer: number;
    scrollElement: Signal<HTMLElement | undefined>;
    debug?: boolean;
  }) => {
    const loadedData = useSignal<any[]>([]);
    const loadingData = useSignal(false);
    const virtualState = useVirtualScroll({
      debug,
      scrollElement,
      scrollOffset: 0,
      totalCount: initialData.value.totalCount,
      estimateSize,
      overscan,
    });
    useTask$(({ track }) => {
      track(() => initialData.value);
      if (initialData.value.elements.length > loadedData.value.length) {
        loadedData.value = initialData.value.elements;
      }
    });
    useTask$(async ({ track }) => {
      track(() => virtualState.state.range);

      const indexToFetch = (virtualState.state.range?.endIndex ?? 0) + buffer;
      if (
        isBrowser &&
        indexToFetch < initialData.value.totalCount &&
        indexToFetch > loadedData.value.length &&
        !loadingData.value
      ) {
        const rangeStart = Math.floor(indexToFetch / pageSize) * pageSize;
        loadingData.value = true;
        // Do this in a hanging promise rather than await so that we don't block the state from updating further
        getNextPage({ rangeStart }).then((rows) => {
          // NOTE: this is not smart about putting the new values in the right place of the array.
          // This will cause problems when scrolling around quickly.
          loadedData.value.splice(
            rows.startIndex ?? 0,
            0,
            ...(rows.elements ?? []),
          );
          loadingData.value = false;
        });
      }
    });

    useVisibleTask$(({ track }) => {
      track(scrollElement);
      if (!scrollElement.value) return;

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
        {visibleRows.value.map((item: VirtualItem, index) => {
          return itemRenderer(item, loadedData.value[item.index], {
            key: item.key.toString(),
            style: {
              height: `${item.size}px`,
              transform: `translateY(${item.start - index * item.size}px)`,
            },
          });
        })}
        {debug ? (
          <div class="fixed z-30 right-0 px-10 bg-white">
            <p>Total count: {initialData.value.totalCount}</p>
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
