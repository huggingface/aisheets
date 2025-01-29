import { server$ } from '@builder.io/qwik-city';

import { updateCell } from '~/services';

interface EditCell {
  id: string;
  value: string;
}

export const useValidateCellUseCase = () =>
  server$(async (editCell: EditCell): Promise<boolean> => {
    try {
      await updateCell({
        ...editCell,
        validated: true,
      });
    } catch (error) {
      return false;
    }

    return true;
  });
