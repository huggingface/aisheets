import { server$ } from '@builder.io/qwik-city';

import { getColumnCellById, updateCell } from '~/services';

interface EditCell {
  id: string;
  value: string;
}

export const useValidateCellUseCase = () =>
  server$(
    async (
      editCell: EditCell,
    ): Promise<{ ok: boolean; validated: boolean }> => {
      try {
        const cell = await getColumnCellById(editCell.id);

        if (!cell) {
          return { ok: false, validated: false };
        }

        await updateCell({
          ...cell,
          value: editCell.value,
          validated: !cell.validated,
        });

        return { ok: true, validated: !cell.validated };
      } catch (error) {
        return { ok: false, validated: false };
      }
    },
  );
