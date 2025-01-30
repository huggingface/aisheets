import { Op } from 'sequelize';
import { ColumnCellModel } from '~/services/db/models/cell';
import { ColumnModel } from '~/services/db/models/column';
import type { Cell } from '~/state';

interface GetRowCellsParams {
  rowIdx: number;
  columns?: string[];
}

export const getRowCells = async ({
  rowIdx,
  columns,
}: GetRowCellsParams): Promise<ColumnCellModel[]> => {
  const cells = await ColumnCellModel.findAll({
    where: {
      [Op.and]: [{ idx: rowIdx }, columns ? { columnId: columns } : {}],
    },
    order: [['createdAt', 'ASC']],
    include: {
      as: 'column',
      model: ColumnModel,
    },
  });

  return cells;
};

export const updateCell = async (cell: Partial<Cell>) => {
  await ColumnCellModel.update({ ...cell }, { where: { id: cell.id! } });
};
