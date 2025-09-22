import { ProcessColumnModel, ProcessModel } from '~/services/db/models';
import type { Process, TaskType } from '~/state';

export interface CreateProcess {
  prompt: string;
  modelName: string;
  modelProvider?: string;
  endpointUrl?: string;
  searchEnabled: boolean;
  columnsReferences?: string[];
  imageColumnId?: string; // For image processing workflows
  task: TaskType;
}

export const createProcess = async ({
  process,
  column,
}: {
  process: CreateProcess;
  column: {
    id: string;
  };
}): Promise<Process> => {
  const model = await ProcessModel.create({
    prompt: process.prompt,
    modelName: process.modelName,
    modelProvider: process.modelProvider,
    endpointUrl: process.endpointUrl ?? null,
    searchEnabled: process.searchEnabled,
    columnId: column.id,
    imageColumnId: process.imageColumnId ?? null,
    task: process.task,
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
    prompt: model.prompt,
    modelName: model.modelName,
    modelProvider: model.modelProvider || undefined,
    endpointUrl: model.endpointUrl ?? undefined,
    searchEnabled: model.searchEnabled,
    columnsReferences: process?.columnsReferences || [],
    imageColumnId: model.imageColumnId ?? undefined,
    task: model.task as TaskType,
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
    prompt: process.prompt,
    modelName: process.modelName,
    modelProvider: process.modelProvider,
    endpointUrl: process.endpointUrl ?? null,
    searchEnabled: process.searchEnabled,
    imageColumnId: process.imageColumnId ?? null,
    task: process.task,
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
    prompt: model.prompt,
    modelName: model.modelName,
    modelProvider: model.modelProvider ?? undefined,
    endpointUrl: model.endpointUrl ?? undefined,
    searchEnabled: model.searchEnabled,
    columnsReferences: process.columnsReferences,
    imageColumnId: model.imageColumnId ?? undefined,
    task: model.task as TaskType,
    updatedAt: model.updatedAt,
  };
};
