import {
  $,
  type Signal,
  Slot,
  component$,
  createContextId,
  useComputed$,
  useContext,
  useContextProvider,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { TEMPORAL_ID, useColumnsStore } from '~/state';

export type Execution = {
  columnId?: string;
  mode?: 'add' | 'edit';
};

const executionContext =
  createContextId<Signal<Execution>>('execution.context');

export const ExecutionProvider = component$(() => {
  const { columns } = useColumnsStore();

  const internalState = useSignal<Execution>({});
  useContextProvider(executionContext, internalState);

  useTask$(({ track }) => {
    track(columns);
    const lastColumnId = columns.value[columns.value.length - 1].id;

    internalState.value = {
      columnId: lastColumnId === TEMPORAL_ID ? lastColumnId : undefined,
      mode: lastColumnId === TEMPORAL_ID ? 'add' : undefined,
    };
  });

  return <Slot />;
});

export const useExecution = () => {
  const context = useContext(executionContext);

  const columnId = useComputed$(() => context.value.columnId);
  const mode = useComputed$(() => context.value.mode);

  return {
    columnId,
    mode,
    open: $((columnId: Execution['columnId'], mode: 'add' | 'edit') => {
      context.value = { columnId, mode };
    }),
    close: $(() => {
      context.value = {};
    }),
  };
};
