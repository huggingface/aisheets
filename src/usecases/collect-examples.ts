import type { Example } from '~/services/inference/materialize-prompt';
import { getRowCells } from '~/services/repository/cells';
import type { Cell, Column } from '~/state';

export interface CollectExamplesParams {
  column: Column;
  validatedCells?: Cell[];
  columnsReferences?: string[];
}

export async function collectExamples({
  column,
  validatedCells,
  columnsReferences,
}: CollectExamplesParams): Promise<Example[]> {
  const hasReferredColumns = columnsReferences && columnsReferences.length > 0;
  const hasValidatedCells = validatedCells && validatedCells.length > 0;

  // Build examples array
  const examples: Example[] = [];

  if (hasReferredColumns) {
    // FromData variant: Get examples with inputs from referenced columns
    for (const validatedCell of validatedCells || []) {
      if (!validatedCell.value) continue;

      const rowCells = await getRowCells({
        rowIdx: validatedCell.idx,
        columns: columnsReferences,
      });

      const inputs = Object.fromEntries(
        rowCells
          .filter((cell): cell is typeof cell & { value: string } =>
            Boolean(cell.column?.name && cell.value),
          )
          .map((cell) => [cell.column!.name, cell.value]),
      );

      examples.push({ output: validatedCell.value, inputs });
    }
  } else if (!(hasValidatedCells || hasReferredColumns)) {
    // When no validated cells or referenced columns, use ALL cells as examples
    examples.push(
      ...column.cells
        .filter((cell) => cell.value)
        .map((cell) => ({
          output: cell.value || '',
          inputs: {},
        })),
    );
  } else {
    // Use only validated cells as examples
    examples.push(
      ...(validatedCells || [])
        .filter((cell) => cell.value)
        .map((cell) => ({
          output: cell.value || '',
          inputs: {},
        })),
    );
  }

  return examples;
}
