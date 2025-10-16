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
  useVisibleTask$,
} from '@builder.io/qwik';
import { useModals } from '~/components';
import {
  type ColumnPrototypeWithId,
  type ColumnPrototypeWithNextColumnId,
  type Dataset,
  useColumnsStore,
  useDatasetsStore,
} from '~/state';

import type { ColumnPrototype, CreateColumn, TaskType } from '~/state/columns';
import { useAddColumnUseCase } from '~/usecases/add-column.usecase';

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

const createColumnPlaceholder = (
  dataset: Dataset,
  info?: ColumnPrototype,
): CreateColumn => {
  const getNextColumnName = (counter = 1): string => {
    const manyColumnsWithName = dataset.columns;
    const newPosibleColumnName = `column_${manyColumnsWithName.length + counter}`;

    if (!manyColumnsWithName.find((c) => c.name === newPosibleColumnName)) {
      return newPosibleColumnName;
    }

    return getNextColumnName(counter + 1);
  };

  const type = info?.type ?? 'text';

  return {
    name: info?.name ?? getNextColumnName(),
    kind: 'dynamic',
    type,
    process: {
      modelName: info?.modelName ?? '',
      modelProvider: info?.modelProvider ?? '',
      prompt: info?.prompt ?? '',
      searchEnabled: false,
      endpointUrl: info?.endpointUrl ?? '',
      columnsReferences: info?.columnsReferences ?? [],
      imageColumnId: info?.imageColumnId ?? undefined,
      task: info?.task ?? 'text-generation',
    },
    dataset,
  };
};

export const useExecution = () => {
  const context = useContext(executionContext);
  const { activeDataset } = useDatasetsStore();
  const { addColumn } = useColumnsStore();
  const {
    isOpenExecutionSidebar,
    openExecutionSidebar,
    closeExecutionSidebar,
  } = useModals('executionSidebar');

  const addNewColumn = useAddColumnUseCase();

  const { columns } = useColumnsStore();

  const pendingScrollColumnId = useSignal<string | null>(null);

  const scrollToColumn = $(async (columnId: string) => {
    const scrollContainer = document.querySelector(
      '.scrollable',
    ) as HTMLElement;
    const columnHeader = document.getElementById(`index-${columnId}`);

    if (scrollContainer && columnHeader) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const columnRect = columnHeader.getBoundingClientRect();

      const availableWidth = containerRect.width - 700;
      const scrollLeft =
        columnRect.left -
        containerRect.left +
        scrollContainer.scrollLeft -
        availableWidth / 2 +
        columnRect.width / 2;

      scrollContainer.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth',
      });
    }
  });

  useVisibleTask$(({ track }) => {
    track(isOpenExecutionSidebar);
    track(pendingScrollColumnId);

    if (isOpenExecutionSidebar.value && pendingScrollColumnId.value) {
      setTimeout(() => {
        scrollToColumn(pendingScrollColumnId.value!);
        pendingScrollColumnId.value = null;
      }, 250);
    }
  });

  const columnId = useComputed$(() => context.value.columnId);
  const mode = useComputed$(() => context.value.mode);
  const column = useComputed$(() =>
    columns.value?.find((c) => c.id === columnId.value),
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
          const column = info as ColumnPrototypeWithId;

          if (!column.columnId) {
            throw new Error('columnId is required when mode is "edit"');
          }

          context.value = {
            columnId: column.columnId,
          };
        } else if (mode === 'add') {
          const columnCreate = createColumnPlaceholder(
            activeDataset.value,
            info,
          );

          const newColumn = await addNewColumn(columnCreate);
          await addColumn(newColumn);

          context.value = {
            columnId: newColumn.id,
            mode: 'add',
          };

          pendingScrollColumnId.value = newColumn.id;
        }

        openExecutionSidebar();
        return;
      },
    ),
    close: $(() => {
      closeExecutionSidebar();

      context.value = {};
    }),
  };
};
