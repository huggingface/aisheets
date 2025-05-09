import { featureExtraction } from '@huggingface/inference';
import * as lancedb from '@lancedb/lancedb';
import * as arrow from 'apache-arrow';
import { DEFAULT_EMBEDDING_MODEL, VECTOR_DB_DIR } from '~/config';
import {
  normalizeFeatureExtractionArgs,
  normalizeOptions,
} from '~/services/inference/run-prompt-execution';
import type { WebSource } from '~/services/websearch/search-sources';
import { flattenTree, stringifyMarkdownElement } from '../markdown';

export const configureEmbeddingsIndex = async () => {
  // Check if the database is empty
  const db = await lancedb.connect(VECTOR_DB_DIR);

  const schema = new arrow.Schema([
    new arrow.Field('dataset_id', new arrow.Utf8()),
    new arrow.Field('source_uri', new arrow.Utf8()),
    new arrow.Field('text', new arrow.Utf8()),
    new arrow.Field(
      'embedding',
      new arrow.FixedSizeList(
        DEFAULT_EMBEDDING_MODEL.embeddingDim,
        new arrow.Field('item', new arrow.Float32(), true),
      ),
    ),
  ]);

  const embeddingsIndex = await db.createEmptyTable('embeddings', schema, {
    existOk: true,
    mode: 'create',
  });

  // Create both vector and FTS indices
  await embeddingsIndex.createIndex('dataset_id', { replace: true });
  await embeddingsIndex.createIndex('text', {
    config: lancedb.Index.fts(),
    replace: true,
  });

  return {
    db,
    embeddingsIndex,
  };
};

const { embeddingsIndex, db } = await configureEmbeddingsIndex();

export const deleteIndex = async () => {
  await db.dropTable(embeddingsIndex.name);
};

const getDetailedInstruct = (query: string): string => {
  return `Represent this sentence for searching relevant passages: ${query}`;
};

export const embedder = async (
  texts: string[],
  options: {
    accessToken: string;
    isQuery?: boolean;
  },
): Promise<number[][]> => {
  if (texts.length === 0) return [];

  const processedTexts =
    options.isQuery && DEFAULT_EMBEDDING_MODEL.isInstruct
      ? texts.map(getDetailedInstruct)
      : texts;

  const results = await featureExtraction(
    normalizeFeatureExtractionArgs({
      inputs: processedTexts,
      accessToken: options.accessToken,
      modelName: DEFAULT_EMBEDDING_MODEL.model,
      modelProvider: DEFAULT_EMBEDDING_MODEL.provider,
      endpointUrl: DEFAULT_EMBEDDING_MODEL.endpointUrl,
    }),
    normalizeOptions(),
  );

  if (!Array.isArray(results)) {
    throw new Error('Invalid response from Hugging Face API');
  }

  return results as number[][];
};

export const indexDatasetSources = async ({
  dataset,
  sources,
  options,
}: {
  dataset: {
    id: string;
    name: string;
  };
  sources: WebSource[];
  options: {
    accessToken: string;
  };
}): Promise<number> => {
  const chunkedSources = sources
    .map((source) => {
      if (!source.markdownTree) return { source, chunks: [] };

      const mdElements = flattenTree(source.markdownTree);
      const chunks = mdElements
        .map(stringifyMarkdownElement)
        .filter((text) => text.length > 200); // Skip chunks with 200 or fewer characters

      return { source, chunks };
    })
    .filter(({ chunks }) => chunks.length > 0);

  let rows: Record<string, any>[] = chunkedSources.flatMap(
    ({ source, chunks }) => {
      return chunks.map((text) => ({
        text,
        source_uri: source.url,
        dataset_id: dataset.id,
      }));
    },
  );

  const processEmbeddingsBatch = async (
    batch: Record<string, any>[],
    batchIdx: number,
  ): Promise<Record<string, any>[]> => {
    console.log(
      `Processing batch ${batchIdx} with ${batch.length} rows for dataset ${dataset.name}`,
    );
    const texts = batch.map((row) => row.text);

    try {
      const embeddings = await embedder(texts, options);

      batch.forEach((text, index) => {
        const embedding = embeddings[index];
        if (!embedding) {
          console.warn(
            `Skipping chunk due to missing embedding for text:\n${text}\n---END OF SKIPPED TEXT---`,
          );
          return;
        }

        batch[index].embedding = embedding;
      });

      return batch.filter((row) => row.embedding);
    } catch (embeddingError) {
      console.warn(
        `Error embedding batch ${batchIdx} for dataset ${dataset.name}:`,
        embeddingError,
      );
      return [];
    }
  };

  const chunkSize = 2;
  const promises = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = rows.slice(i, i + chunkSize);
    promises.push(() => processEmbeddingsBatch(batch, i / chunkSize));
  }

  const rowsWithEmbeddings = [];
  const parallelRequests = 12; // Number of parallel requests
  for (let i = 0; i < promises.length; i += parallelRequests) {
    const batchPromises = promises.slice(i, i + parallelRequests);
    const batchResults = await Promise.all(batchPromises.map((fn) => fn()));

    rowsWithEmbeddings.push(...batchResults.flat());
  }
  rows = rowsWithEmbeddings;

  if (rows.length > 0) await embeddingsIndex.add(rows);
  return rows.length;
};

export const queryDatasetSources = async ({
  dataset,
  query,
  options,
  useHybridSearch = true,
}: {
  dataset: {
    id: string;
  };
  query: string;
  options: {
    accessToken: string;
  };
  useHybridSearch?: boolean;
}): Promise<
  {
    text: string;
    source_uri: string;
    score?: number;
  }[]
> => {
  if (!query) return [];

  const filterByDataset = `dataset_id = "${dataset.id}"`;

  const datasetChunks = await embeddingsIndex.countRows(filterByDataset);
  if (datasetChunks === 0) {
    console.warn(
      `No chunks found for dataset ${dataset.id}. Please index the sources first.`,
    );
    return [];
  }

  try {
    const embeddings = await embedder([query], { ...options, isQuery: true });

    if (useHybridSearch) {
      // Perform hybrid search with reranking
      const results = await embeddingsIndex
        .query()
        .where(filterByDataset)
        .fullTextSearch(query)
        .nearestTo(embeddings[0])
        .rerank(await lancedb.rerankers.RRFReranker.create())
        .limit(10)
        .toArray();

      return results.map(
        (result: { text: string; source_uri: string; score?: number }) => ({
          text: result.text,
          source_uri: result.source_uri,
          score: result.score,
        }),
      );
    }

    // Fall back to vector search only
    const results = await embeddingsIndex
      .search(embeddings[0], 'vector')
      .where(filterByDataset)
      .limit(10)
      .toArray();

    return results.map((result: { text: string; source_uri: string }) => ({
      text: result.text,
      source_uri: result.source_uri,
    }));
  } catch (error) {
    console.error('Error querying dataset sources:', error);
    return [];
  }
};
