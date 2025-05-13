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
  prompt?: string;
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
  const initialPrompt = useComputed$(() => context.value.prompt);

  return {
    columnId,
    mode,
    initialPrompt,
    open: $(
      (
        columnId: Execution['columnId'],
        mode: Execution['mode'],
        prompt?: string,
      ) => {
        console.log('open execution', columnId, mode, prompt);
        context.value = { columnId, mode, prompt };
      },
    ),
    close: $(() => {
      context.value = {};
    }),
  };
};
