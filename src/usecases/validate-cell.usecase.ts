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
  const { replaceCell } = useColumnsStore();

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
    async (cell: Cell, validatedContent: string, validated: boolean) => {
      const updatedCell = await validateCellServer$({
        id: cell.id,
        idx: cell.idx,
        value: validatedContent,
        validated,
        column: cell.column!,
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
