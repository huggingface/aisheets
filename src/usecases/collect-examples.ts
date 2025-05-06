import type { Example } from '~/services/inference/materialize-prompt';
import { getRowCells } from '~/services/repository/cells';
import type { Cell } from '~/state';

export interface CollectExamplesParams {
  validatedCells?: Cell[];
  columnsReferences?: string[];
}

export async function collectValidatedExamples({
  validatedCells,
  columnsReferences,
}: CollectExamplesParams): Promise<Example[]> {
  if (!validatedCells) return [];

  // Build examples array
  const examples = Promise.all(
    validatedCells
      .filter((cell): cell is Cell => Boolean(cell.value))
      .map(async (cell) => {
        const rowCells = await getRowCells({
          rowIdx: cell.idx,
          columns: columnsReferences || [],
        });

        const inputs = Object.fromEntries(
          rowCells
            .filter((cell): cell is typeof cell & { value: string } =>
              Boolean(cell.column?.name && cell.value),
            )
            .map((cell) => [cell.column!.name, cell.value]),
        );

        return { output: cell.value, inputs, validated: true };
      }),
  );

  return examples;
}
