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
  prompt?: string;
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

    if (lastColumnId === TEMPORAL_ID) {
      internalState.value = {
        columnId: lastColumnId,
        mode: 'add',
      };
    }
  });

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
        context.value = { columnId, mode, prompt };
      },
    ),
    close: $(() => {
      context.value = {};
    }),
  };
};
