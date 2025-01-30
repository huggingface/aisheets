import { afterEach, describe, expect, it } from 'vitest';
import { ColumnModel, ProcessColumnModel } from '../db/models/column';
import { ProcessModel } from '../db/models/process';

import { addColumn } from './columns';

afterEach(async () => {
  await ColumnModel.destroy({ where: {} });
  await ProcessModel.destroy({ where: {} });
});

describe('addColumn', () => {
  it('should add a new column with a process', async () => {
    const newColumn = await addColumn(
      {
        name: 'Column 1',
        type: 'text',
        kind: 'static',
      },
      {
        modelName: 'model',
        prompt: 'test prompt',
        offset: 0,
        limit: 10,
      },
    );

    expect(await ColumnModel.count()).toBe(1);
    expect(await ProcessModel.count()).toBe(1);
  });

  it('should add a new column with a process and referred columns', async () => {
    const columns = await ColumnModel.bulkCreate([
      {
        name: 'column 1',
        type: 'text',
        kind: 'static',
      },
      {
        name: 'column 2',
        type: 'text',
        kind: 'static',
      },
    ]);

    const newColumn = await addColumn(
      {
        name: 'Column 1',
        type: 'text',
        kind: 'static',
      },
      {
        modelName: 'model',
        prompt: 'test prompt',
        offset: 0,
        limit: 10,
        columnsReferences: columns.map((c) => c.id),
      },
    );

    expect(await ColumnModel.count()).toBe(3);
    expect(await ProcessModel.count()).toBe(1);
    expect(await ProcessColumnModel.count()).toBe(2);

    const process = await ProcessModel.findOne({
      where: { id: newColumn.process!.id },
      include: [ProcessModel.associations.referredColumns],
    });

    expect(process).not.toBeNull();
    expect(process!.referredColumns).toHaveLength(2);
  });
});
