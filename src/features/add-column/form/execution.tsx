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
import {
  type ColumnPrototypeWithId,
  type ColumnPrototypeWithNextColumnId,
  useColumnsStore,
} from '~/state';

import type { TaskType } from '~/state/columns';

export type Execution = {
  columnId?: string;
  prompt?: string;
  modelName?: string;
  modelProvider?: string;
  endpointUrl?: string;
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

type ExecutionInfo<T extends Execution['mode']> = T extends 'add'
  ? ColumnPrototypeWithNextColumnId
  : ColumnPrototypeWithId;

export const useExecution = () => {
  const context = useContext(executionContext);
  const {
    isOpenExecutionSidebar,
    openExecutionSidebar,
    closeExecutionSidebar,
  } = useModals('executionSidebar');

  const { columns, addTemporalColumn, removeTemporalColumn } =
    useColumnsStore();

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
        if (mode === 'edit') {
          const casted = info as ColumnPrototypeWithId;

          if (!casted.columnId) {
            throw new Error('columnId is required when mode is "edit"');
          }

          context.value = {
            columnId: casted.columnId,
            mode,
          };

          openExecutionSidebar();

          return;
        }

        if (mode === 'add') {
          const casted = info as ColumnPrototypeWithNextColumnId;

          const newbie = await addTemporalColumn(casted);
          if (!newbie) return;

          context.value = {
            columnId: newbie.id,
            mode,
          };

          openExecutionSidebar();
        }
      },
    ),
    close: $(async () => {
      if (mode.value === 'add') {
        await removeTemporalColumn();
      }

      closeExecutionSidebar();

      context.value = {};
    }),
  };
};
