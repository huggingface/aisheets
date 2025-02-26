import { ProcessColumnModel, ProcessModel } from '~/services/db/models';
import type { CreateColumn, Process } from '~/state';

export const createProcess = async (
  newColumn: CreateColumn,
  columnId: string,
): Promise<Process> => {
  const { process } = newColumn;

  const model = await ProcessModel.create({
    limit: process.limit,
    modelName: process.modelName,
    modelProvider: process.modelProvider,
    offset: process.offset,
    prompt: process.prompt,
    columnId: columnId,
  });

  // TODO: Try to create junction model when creating a process
  if ((process.columnsReferences ?? []).length > 0) {
    await ProcessColumnModel.bulkCreate(
      process.columnsReferences!.map((columnId) => {
        return { processId: model.id, columnId };
      }),
    );
  }

  return {
    id: model.id,
    limit: model.limit,
    modelName: model.modelName,
    modelProvider: model.modelProvider,
    offset: model.offset,
    prompt: model.prompt,
    columnsReferences: process.columnsReferences,
    updatedAt: model.updatedAt,
  };
};

export const updateProcess = async (process: Process): Promise<Process> => {
  const model = await ProcessModel.findByPk(process.id);

  if (!model) {
    throw new Error('Process not found');
  }

  model.changed('updatedAt', true);
  model.set({
    limit: process.limit,
    modelName: process.modelName,
    modelProvider: process.modelProvider,
    offset: process.offset,
    prompt: process.prompt,
  });

  await model.save();

  if ((process.columnsReferences ?? []).length > 0) {
    await ProcessColumnModel.destroy({ where: { processId: process.id } });
    await ProcessColumnModel.bulkCreate(
      process.columnsReferences!.map((columnId) => {
        return { processId: process.id, columnId };
      }),
    );
  }

  return {
    id: model.id,
    limit: model.limit,
    modelName: model.modelName,
    modelProvider: model.modelProvider,
    offset: model.offset,
    prompt: model.prompt,
    columnsReferences: process.columnsReferences,
    updatedAt: model.updatedAt,
  };
};
