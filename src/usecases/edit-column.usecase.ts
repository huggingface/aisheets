import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { updateColumn } from '~/services';
import { type Column, useServerSession } from '~/state';

export const useEditColumnUseCase = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    column: Column,
  ): Promise<Column> {
    if (!column.process) {
      throw new Error('Process is required to create a column');
    }

    if (!useServerSession(this)) throw new Error('No session found');

    const updated = await updateColumn(column);

    return updated;
  });
