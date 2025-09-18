import {
  $,
  component$,
  createContextId,
  type Signal,
  Slot,
  useComputed$,
  useContext,
  useContextProvider,
  useSignal,
} from '@builder.io/qwik';

import type { TaskType } from '~/state/columns';

export type Execution = {
  columnId?: string;
  prompt?: string;
  modelName?: string;
  modelProvider?: string;
  mode?: 'add' | 'edit';
  task?: TaskType;
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
  const task = useComputed$(() => context.value.task);
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
    task,
    initialProcess,
    open: $(
      (
        columnId: Execution['columnId'],
        mode: Execution['mode'],
        options?: {
          prompt?: string;
          modelName?: string;
          modelProvider?: string;
          task?: TaskType;
        },
      ) => {
        context.value = {
          columnId,
          mode,
          prompt: options?.prompt,
          modelName: options?.modelName,
          modelProvider: options?.modelProvider,
          task: options?.task,
        };
      },
    ),
    close: $(() => {
      context.value = {};
    }),
  };
};
