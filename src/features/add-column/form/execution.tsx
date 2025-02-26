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
} from '@builder.io/qwik';

export type Execution = {
  columnId?: string;
  mode?: 'add' | 'edit';
};

const executionContext =
  createContextId<Signal<Execution>>('execution.context');

export const ExecutionProvider = component$(() => {
  const internalState = useSignal<Execution>({});
  useContextProvider(executionContext, internalState);

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
