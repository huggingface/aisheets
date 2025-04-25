import type { RequestEventBase } from '@builder.io/qwik-city';
import { getDatasetColumns } from '../services/repository/columns';
import { useServerSession } from '../state/session';
import { generateCells } from './generate-cells';

/**
 * Populates a dataset by generating cells for all its columns
 */
export const populateDataset = async function (
  this: RequestEventBase<QwikCityPlatform>,
  datasetId: string,
): Promise<void> {
  // Get the session directly from the request context
  const session = useServerSession(this);

  try {
    // Get the full column objects with processes
    const columns = await getDatasetColumns({ id: datasetId });

    // Generate cells for each column synchronously
    for (const column of columns) {
      if (!column.process) continue;

      const hasReferences = column.process.columnsReferences?.length > 0;

      for await (const _ of generateCells({
        column,
        process: column.process,
        session,
        limit: column.process.limit,
        offset: column.process.offset,
        parallel: hasReferences,
      })) {
        // We don't need to do anything with the yielded cells
      }
    }
  } catch (error) {
    console.error('❌ [PopulateDataset] Error populating dataset:', error);
    throw error;
  }
};
