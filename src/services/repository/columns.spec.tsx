import { afterEach, describe, expect, it } from 'vitest';
import { ColumnModel, ProcessColumnModel } from '../db/models/column';
import { ProcessModel } from '../db/models/process';

import { DatasetModel } from '../db/models';
import { createColumn } from './columns';

afterEach(async () => {
  await DatasetModel.destroy({ where: {} });
  await ColumnModel.destroy({ where: {} });
  await ProcessModel.destroy({ where: {} });
});

describe('addColumn', () => {
  it('should add a new column with a process', async () => {
    const dataset = await DatasetModel.create({
      name: 'dataset',
      createdBy: 'test',
    });

    const newColumn = await createColumn({
      name: 'Column 1',
      type: 'text',
      kind: 'static',
      process: {
        modelName: 'model',
        prompt: 'test prompt',
        offset: 0,
        limit: 10,
      },
      dataset: {
        id: dataset.id,
        name: dataset.name,
        createdBy: dataset.createdBy,
      },
    });

    expect(await ColumnModel.count()).toBe(1);
    expect(await ProcessModel.count()).toBe(1);
  });

  it('should add a new column with a process and referred columns', async () => {
    const dataset = await DatasetModel.create({
      name: 'dataset',
      createdBy: 'test',
    });

    const columns = await ColumnModel.bulkCreate([
      {
        name: 'column 1',
        type: 'text',
        kind: 'static',
        datasetId: dataset.id,
      },
      {
        name: 'column 2',
        type: 'text',
        kind: 'static',
        datasetId: dataset.id,
      },
    ]);

    const newColumn = await createColumn({
      name: 'Column 1',
      type: 'text',
      kind: 'static',
      process: {
        modelName: 'model',
        prompt: 'test prompt',
        offset: 0,
        limit: 10,
        columnsReferences: columns.map((c) => c.id),
      },
      dataset: {
        id: dataset.id,
        name: dataset.name,
        createdBy: dataset.createdBy,
      },
    });

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
