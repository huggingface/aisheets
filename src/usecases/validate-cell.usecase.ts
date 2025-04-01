import { server$ } from '@builder.io/qwik-city';

import { createCell, updateCell } from '~/services';
import type { Cell } from '~/state';

interface EditCell {
  id?: string;
  idx: number;
  value: string;
  validated: boolean;
  column: {
    id: string;
  };
}

export const useValidateCellUseCase = () =>
  server$(async (editCell: EditCell): Promise<Cell> => {
    try {
      return await updateCell(editCell);
    } catch (error) {
      return await createCell({
        cell: editCell,
        columnId: editCell.column.id,
      });
    }
  });
