import { $ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';

import { createCell, updateCell } from '~/services';
import { type Cell, useColumnsStore } from '~/state';

interface EditCell {
  id?: string;
  idx: number;
  value: string;
  validated: boolean;
  column: {
    id: string;
  };
}

export const useValidateCellUseCase = () => {
  const { getColumn, replaceCell } = useColumnsStore();

  const validateCellServer$ = server$(
    async (editCell: EditCell): Promise<Cell> => {
      try {
        return await updateCell(editCell);
      } catch (error) {
        return await createCell({
          cell: editCell,
          columnId: editCell.column.id,
        });
      }
    },
  );

  const validateCell = $(
    async (cell: Cell, validatedContent: string, isValidated = true) => {
      if (!cell.column) {
        throw new Error('Cell does not have a column associated with it.');
      }

      const column = await getColumn(cell.column.id);

      if (!column) {
        throw new Error(`Column with id ${cell.column.id} not found.`);
      }

      const validated = isValidated && column.kind === 'dynamic';

      const updatedCell = await validateCellServer$({
        id: cell.id,
        idx: cell.idx,
        value: validatedContent,
        validated: validated,
        column: cell.column,
      });

      replaceCell({
        ...updatedCell,
        value: validatedContent,
        updatedAt: new Date(),
        validated,
      });
    },
  );

  return validateCell;
};
