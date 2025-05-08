import { featureExtraction } from '@huggingface/inference';
import * as lancedb from '@lancedb/lancedb';
import * as arrow from 'apache-arrow';
import { VECTOR_DB_DIR, default_embedding_model } from '~/config';
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
        default_embedding_model.embedding_dim,
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
    options.isQuery && default_embedding_model.is_instruct
      ? texts.map(getDetailedInstruct)
      : texts;

  const results = await featureExtraction(
    normalizeFeatureExtractionArgs({
      inputs: processedTexts,
      accessToken: options.accessToken,
      modelName: default_embedding_model.model,
      modelProvider: default_embedding_model.provider,
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
  const indexData = (
    await Promise.all(
      sources.flatMap(async (source) => {
        if (!source.markdownTree) return [];
        try {
          const mdElements = flattenTree(source.markdownTree);
          const textChunks = mdElements
            .map(stringifyMarkdownElement)
            .filter((text) => text.length > 200); // Skip chunks with 200 or fewer characters

          const BATCH_SIZE = 64;
          const sourceData: Array<{
            text: string;
            embedding: number[];
            source_uri: string;
            dataset_id: string;
          }> = [];

          for (let i = 0; i < textChunks.length; i += BATCH_SIZE) {
            const batch = textChunks.slice(i, i + BATCH_SIZE);
            try {
              const embeddings = await embedder(batch, options);

              batch.forEach((text, index) => {
                const embedding = embeddings[index];
                if (!embedding) {
                  console.warn(
                    `Skipping chunk due to missing embedding for text:\n${text}\n---END OF SKIPPED TEXT---`,
                  );
                  return;
                }

                sourceData.push({
                  text,
                  embedding,
                  source_uri: source.url,
                  dataset_id: dataset.id,
                });
              });
            } catch (embeddingError) {
              console.warn(
                `Error embedding batch for source ${source.url}:`,
                embeddingError,
              );
            }
          }

          return sourceData;
        } catch (error) {
          console.warn(`Error processing source ${source.url}:`, error);
          return [];
        }
      }),
    )
  ).flat();

  if (indexData.length > 0) {
    await embeddingsIndex.add(indexData);
  }

  return indexData.length;
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
