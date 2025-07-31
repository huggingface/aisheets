import { materializePrompt } from '~/services/inference/materialize-prompt';
import { getColumnCellByIdx, getRowCells } from '~/services/repository';
import type { Cell, Column, Dataset } from '~/state';
import { collectValidatedExamples } from '~/usecases/collect-examples';

export async function generateDatasetConfig(dataset: Dataset): Promise<{
  columns: Record<
    string,
    {
      modelName?: string;
      modelProvider?: string;
      userPrompt?: string;
      prompt?: string;
      searchEnabled?: boolean;
      columnsReferences?: string[];
    }
  >;
}> {
  const columnConfigs: Record<string, any> = {};

  for (const column of dataset.columns) {
    if (!column.process) continue;

    // Skip columns with empty model configuration
    if (
      !column.process.modelName &&
      !column.process.modelProvider &&
      !column.process.prompt
    ) {
      continue;
    }

    const prompt = await promptTemplateForColumn(column);

    columnConfigs[column.name] = {
      modelName: column.process.modelName,
      modelProvider: column.process.modelProvider,
      userPrompt: column.process.prompt,
      prompt,
      searchEnabled: column.process.searchEnabled,
      columnsReferences: column.process.columnsReferences?.map((colId) => {
        const refColumn = dataset.columns.find((c) => c.id === colId);
        return refColumn?.name || colId;
      }),
    };
  }

  return { columns: columnConfigs };
}

async function getFirstRowData(columnsReferences: string[]) {
  const firstRowCells = await getRowCells({
    rowIdx: 0,
    columns: columnsReferences,
  });
  return Object.fromEntries(
    firstRowCells.map((cell) => [cell.column!.name, cell.value]),
  );
}

const promptTemplateForColumn = async (
  column: Column,
): Promise<string | undefined> => {
  const { process } = column;
  if (!process || !process.prompt) return undefined;

  if (column.type === 'image') {
    return undefined; // Image columns do not have prompt templates
  }

  // Fetch complete cell data for validated cells
  const validatedCells = await Promise.all(
    column.cells
      .filter((cell) => cell.validated)
      .map((cell) =>
        getColumnCellByIdx({
          idx: cell.idx,
          columnId: column.id,
        }),
      ),
  );

  const examples = await collectValidatedExamples({
    validatedCells: validatedCells.filter(
      (cell): cell is Cell => cell !== null,
    ),
    columnsReferences: process.columnsReferences,
  });

  // Get data for prompt materialization
  const data: any | undefined = process.columnsReferences?.length
    ? await getFirstRowData(process.columnsReferences)
    : {};

  // Replace each value in data with its key wrapped in {{}}
  for (const key of Object.keys(data)) {
    data[key] = `{{${key}}}`;
  }

  return materializePrompt({
    instruction: process.prompt,
    data: data ?? undefined,
    examples: examples?.length ? examples : undefined,
  });
};
