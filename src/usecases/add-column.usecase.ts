import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { createColumn } from '~/services';
import { type Column, type CreateColumn, useServerSession } from '~/state';

export const useAddColumnUseCase = () =>
  server$(async function (
    this: RequestEventBase<QwikCityPlatform>,
    newColum: CreateColumn,
  ): Promise<Column> {
    if (!useServerSession(this)) throw new Error('No session found');

    const column = await createColumn({
      name: newColum.name,
      type: newColum.type,
      kind: newColum.kind,
      dataset: newColum.dataset,
      process: newColum.process,
    });

    return {
      id: column.id,
      name: column.name,
      type: column.type,
      kind: column.kind,
      size: 0,
      cells: [],
      dataset: column.dataset,
      process: column.process,
      visible: column.visible,
    };
  });
