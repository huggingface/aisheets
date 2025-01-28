import { server$ } from '@builder.io/qwik-city';

import { updateCell } from '~/services';

interface EditCell {
  id: string;
  value: string;
}

export const useUpdateCellUseCase = () =>
  server$(async (editCell: EditCell): Promise<boolean> => {
    try {
      await updateCell(editCell.id, editCell.value);
    } catch (error) {
      return false;
    }

    return true;
  });
