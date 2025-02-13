import { server$ } from '@builder.io/qwik-city';

import { updateCell } from '~/services';

interface EditCell {
  id: string;
  value: string;
  validated: boolean;
}

export const useValidateCellUseCase = () =>
  server$(async (editCell: EditCell): Promise<boolean> => {
    try {
      await updateCell({
        ...editCell,
      });

      return true;
    } catch (error) {
      return false;
    }
  });
