import { ColumnModel, ProcessColumnModel } from '~/services/db/models/column';
import { ProcessModel } from '~/services/db/models/process';
import type { Cell, Column, ColumnKind, ColumnType, Process } from '~/state';

export const getAllColumns = async (): Promise<Column[]> => {
  const columns = await ColumnModel.findAll({
    include: [
      {
        association: ColumnModel.associations.cells,
        separate: true,
        order: [['idx', 'ASC']],
      },
      {
        association: ColumnModel.associations.process,
        include: [ProcessModel.associations.referredColumns],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    type: column.type as ColumnType,
    kind: column.kind as ColumnKind,
    cells: column.cells.map((cell) => ({
      id: cell.id,
      idx: cell.idx,
      value: cell.value,
      error: cell.error,
      validated: cell.validated,
      columnId: cell.columnId,
      updatedAt: cell.updatedAt,
    })),
    process: {
      columnsReferences: (column.process?.referredColumns ?? []).map(
        (column) => column.id,
      ),
      limit: column.process?.limit ?? 0,
      modelName: column.process?.modelName ?? '',
      offset: column.process?.offset ?? 0,
      prompt: column.process?.prompt ?? '',
    },
  }));
};

export const getColumnById = async (id: string): Promise<Column | null> => {
  const column = await ColumnModel.findByPk(id, {
    include: [
      {
        association: ColumnModel.associations.cells,
        separate: true,
        order: [['idx', 'ASC']],
      },
      {
        association: ColumnModel.associations.process,
        include: [ProcessModel.associations.referredColumns],
      },
    ],
  });

  if (!column) return null;

  return {
    id: column.id,
    name: column.name,
    type: column.type as ColumnType,
    kind: column.kind as ColumnKind,
    cells: column.cells.map((cell) => ({
      id: cell.id,
      idx: cell.idx,
      value: cell.value,
      error: cell.error,
      validated: cell.validated,
      columnId: cell.columnId,
      updatedAt: cell.updatedAt,
    })),
    process: {
      id: column.process?.id,
      columnsReferences: (column.process?.referredColumns ?? []).map(
        (column) => column.id,
      ),
      limit: column.process?.limit ?? 0,
      modelName: column.process?.modelName ?? '',
      offset: column.process?.offset ?? 0,
      prompt: column.process?.prompt ?? '',
    },
  };
};

export const addColumn = async (
  column: Omit<Column, 'id' | 'cells'>,
  process?: Process,
) => {
  const cells: Cell[] = [];

  const addedColumn = await ColumnModel.create({
    name: column.name,
    type: column.type,
    kind: column.kind,
  });

  if (process) {
    const newProcess = await ProcessModel.create({
      limit: process.limit,
      modelName: process.modelName,
      offset: process.offset,
      prompt: process.prompt,
      columnId: addedColumn.id,
    });
    // TODO: Try to create junction model when creating a process
    if ((process.columnsReferences ?? []).length > 0) {
      await ProcessColumnModel.bulkCreate(
        process.columnsReferences!.map((columnId) => {
          return { processId: newProcess.id, columnId };
        }),
      );
    }

    addedColumn.process = newProcess;
  }

  const handler: Column & {
    addCell: (
      cell: Omit<Cell, 'id' | 'validated' | 'columnId' | 'updatedAt'>,
    ) => Promise<Cell>;
  } = {
    addCell: async (
      cell: Omit<Cell, 'id' | 'validated' | 'columnId' | 'updatedAt'>,
    ): Promise<Cell> => {
      const newbie = await addedColumn.createCell({
        idx: cell.idx,
        value: cell.value ?? '',
        error: cell.error ?? '',
      });

      cells.push(newbie);

      return {
        id: newbie.id,
        idx: newbie.idx,
        value: newbie.value,
        error: newbie.error,
        validated: newbie.validated,
        columnId: newbie.columnId,
        updatedAt: newbie.updatedAt,
      };
    },
    id: addedColumn.id,
    name: addedColumn.name,
    type: addedColumn.type as ColumnType,
    kind: addedColumn.kind as ColumnKind,
    cells,
    process: {
      id: addedColumn.process?.id,
      columnsReferences: (addedColumn.process?.referredColumns ?? []).map(
        (column) => column.id,
      ),
      limit: addedColumn.process?.limit ?? 0,
      modelName: addedColumn.process?.modelName ?? '',
      offset: addedColumn.process?.offset ?? 0,
      prompt: addedColumn.process?.prompt ?? '',
    },
  };

  return handler;
};
