import { ProcessColumnModel, ProcessModel } from '~/services/db/models';
import type { Process } from '~/state';

export interface CreateProcess {
  prompt: string;
  modelName: string;
  modelProvider: string;
  useEndpointURL?: boolean;
  searchEnabled: boolean;
  columnsReferences?: string[];
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
    useCustomEndpoint: process.useEndpointURL ?? false,
    searchEnabled: process.searchEnabled,
    columnId: column.id,
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
    modelProvider: model.modelProvider,
    useEndpointURL: model.useCustomEndpoint,
    searchEnabled: model.searchEnabled,
    columnsReferences: process?.columnsReferences || [],
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
    useCustomEndpoint: process.useEndpointURL ?? false,
    searchEnabled: process.searchEnabled,
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
    modelProvider: model.modelProvider,
    useEndpointURL: model.useCustomEndpoint,
    searchEnabled: model.searchEnabled,
    columnsReferences: process.columnsReferences,
    updatedAt: model.updatedAt,
  };
};
