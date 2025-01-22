import { type InferCreationAttributes } from "sequelize";
import { ColumnModel } from "~/services/db/models/column";
import { type Column } from "~/state";

export const getAllColumns = async (): Promise<Column[]> => {
  const columns = await ColumnModel.findAll({
    include: [ColumnModel.associations.cells],
  });

  return columns.map((column) => ({
    id: column.id,
    name: column.name,
    type: column.type,
    kind: column.kind,
    cells: column.cells.map((cell) => ({
      id: cell.id,
      idx: cell.idx,
      value: cell.value,
      error: cell.error,
    })),
  }));
};

export const addColumn = async (
  column: Omit<InferCreationAttributes<ColumnModel>, "id">,
) => {
  return ColumnModel.create(column);
};
