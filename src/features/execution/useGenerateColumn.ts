import { $, noSerialize } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';

import { getColumnById, getColumnCellById } from '~/services';
import { type Cell, type Column, useColumnsStore } from '~/state';
import { useEditColumnUseCase } from '~/usecases/edit-column.usecase';
import { useGenerateCellsUseCase } from '~/usecases/generate-cells.usecase';

const getCellById$ = server$(getColumnCellById);
const getColumnById$ = server$(getColumnById);

export const useGenerateColumn = () => {
  const { updateColumn, replaceCell } = useColumnsStore();

  const editColumn = useEditColumnUseCase();
  const generateCells = useGenerateCellsUseCase();

  const onEditColumn = $(async (column: Column) => {
    if (column.process?.isExecuting) {
      console.warn('Column is already being processed');
      return;
    }

    column.process!.isExecuting = true;
    column.process!.cancellable = noSerialize(new AbortController());

    await updateColumn(column);

    let updatedColumn = await editColumn(column);
    const generatedCells: Record<string, Cell> = {};

    column.process!.cancellable!.signal.onabort = async () => {
      for (const cellId in generatedCells) {
        const cell = generatedCells[cellId];

        if (!cell.generating) continue;

        let latest = await getCellById$(cell.id!);
        if (!latest) latest = cell;

        latest.generating = false;
        await replaceCell(latest);
      }

      const updated = await getColumnById$(column.id);
      if (updated) await updateColumn(updated);
    };

    updatedColumn.process!.cancellable = column.process!.cancellable;
    updatedColumn.process!.isExecuting = column.process!.isExecuting;
    updatedColumn.process!.limit = column.process?.limit;
    updatedColumn.process!.offset = column.process?.offset;

    const response = await generateCells(
      updatedColumn.process!.cancellable!.signal,
      updatedColumn,
    );

    try {
      for await (const cell of response) {
        await replaceCell(cell);
        generatedCells[cell.idx] = cell;
      }
    } finally {
      const col = await getColumnById$(column.id);
      if (col) updatedColumn = col;

      updatedColumn.process!.isExecuting = false;
      updatedColumn.process!.cancellable = undefined;
      await updateColumn(updatedColumn);
    }
  });

  const onGenerateColumn = $(async (column: Column) => {
    await onEditColumn(column);
  });

  return { onGenerateColumn };
};
