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
  modelName?: string;
  modelProvider?: string;
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
  const initialProcess = useComputed$(() => {
    return {
      prompt: context.value.prompt,
      modelName: context.value.modelName,
      modelProvider: context.value.modelProvider,
    };
  });

  return {
    columnId,
    mode,
    initialProcess,
    open: $(
      (
        columnId: Execution['columnId'],
        mode: Execution['mode'],
        prompt?: string,
        modelName?: string,
        modelProvider?: string,
      ) => {
        context.value = { columnId, mode, prompt, modelName, modelProvider };
      },
    ),
    close: $(() => {
      context.value = {};
    }),
  };
};
