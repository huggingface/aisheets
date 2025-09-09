import {
  $,
  type Signal,
  Slot,
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';
import type { Column } from '~/state';

const columnSizeContext =
  createContextId<Signal<Record<Column['id'], number>>>('column-ui.context');

export const ColumnSizeProvider = component$(() => {
  useContextProvider(columnSizeContext, useSignal({}));

  return <Slot />;
});

export const useColumnsSizeContext = () => {
  const columnSize = useContext(columnSizeContext);

  return {
    columnSize,
    update: $((columnId: string, width: number) => {
      columnSize.value = { ...columnSize.value, [columnId]: width };
    }),
  };
};
