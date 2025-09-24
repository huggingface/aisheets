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
import { useModals } from '~/components';
import { type Column, type ColumnPrototype, useColumnsStore } from '~/state';

export type Execution = {
  columnId?: string;
  prompt?: string;
  modelName?: string;
  modelProvider?: string;
  endpointUrl?: string;
  mode?: 'add' | 'edit';
};

const executionContext =
  createContextId<Signal<Execution>>('execution.context');

export const ExecutionProvider = component$(() => {
  const internalState = useSignal<Execution>({});
  useContextProvider(executionContext, internalState);

  return <Slot />;
});

type ColumnPrototypeWithId = ColumnPrototype & { columnId: Column['id'] };

type ExecutionInfo<T extends Execution['mode']> = T extends 'add'
  ? ColumnPrototype
  : ColumnPrototypeWithId;

export const useExecution = () => {
  const context = useContext(executionContext);
  const {
    isOpenExecutionSidebar,
    openExecutionSidebar,
    closeExecutionSidebar,
  } = useModals('executionSidebar');
  const { columns, addTemporalColumn } = useColumnsStore();

  const columnId = useComputed$(() => context.value.columnId);
  const mode = useComputed$(() => context.value.mode);
  const column = useComputed$(() =>
    columns.value.find((c) => c.id === columnId.value),
  );

  return {
    columnId,
    column,
    mode,
    isOpenExecutionSidebar,
    open: $(
      async <T extends Execution['mode']>(
        mode: T,
        info: ExecutionInfo<T>,
      ): Promise<void> => {
        const casted = info as ColumnPrototypeWithId;

        if (mode !== 'add' && !casted.columnId) {
          throw new Error('columnId is required when mode is not "edit"');
        }

        if (mode === 'add') {
          const newbie = await addTemporalColumn(info);
          if (newbie) {
            casted.columnId = newbie.id;
          }
        }

        context.value = {
          columnId: casted.columnId,
          mode,
        };

        openExecutionSidebar();
      },
    ),
    close: $(() => {
      closeExecutionSidebar();

      context.value = {};
    }),
  };
};
