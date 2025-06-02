import { featureExtraction } from '@huggingface/inference';
import { pipeline } from '@huggingface/transformers';
import * as lancedb from '@lancedb/lancedb';
import * as arrow from 'apache-arrow';
import { DEFAULT_EMBEDDING_MODEL, VECTOR_DB_DIR } from '~/config';
import {
  normalizeFeatureExtractionArgs,
  normalizeOptions,
} from '~/services/inference/run-prompt-execution';
import type { WebSource } from '~/services/websearch/search-sources';
import {
  flattenTree,
  markdownTreeToString,
  stringifyMarkdownElement,
} from '../markdown';
import { MarkdownElementType } from '../types';
import type { HeaderElement } from '../types';

let processEmbeddings: (
  texts: string[],
  options: {
    accessToken: string;
  },
) => Promise<number[][]> = async () => {
  throw new Error('processEmbeddings function not initialized');
};

const { provider, endpointUrl, model } = DEFAULT_EMBEDDING_MODEL;

if (provider === undefined && endpointUrl === undefined) {
  const extractor = await pipeline('feature-extraction', model);

  processEmbeddings = async (
    texts: string[],
    options: {
      accessToken: string;
    },
  ): Promise<number[][]> => {
    const results = await extractor(texts, { pooling: 'cls' });
    return results.tolist();
  };
} else {
  processEmbeddings = async (
    texts: string[],
    options: {
      accessToken: string;
    },
  ): Promise<number[][]> => {
    const results = await featureExtraction(
      normalizeFeatureExtractionArgs({
        inputs: texts,
        accessToken: options.accessToken,
        modelName: model,
        modelProvider: provider!,
        endpointUrl: endpointUrl,
      }),
      normalizeOptions(),
    );

    return results as number[][];
  };
}

export const configureEmbeddingsIndex = async () => {
  // Check if the database is empty
  const db = await lancedb.connect(VECTOR_DB_DIR);

  const { embeddingDim } = DEFAULT_EMBEDDING_MODEL;

  const schema = new arrow.Schema([
    new arrow.Field('dataset_id', new arrow.Utf8()),
    new arrow.Field('source_uri', new arrow.Utf8()),
    new arrow.Field('text', new arrow.Utf8()),
    new arrow.Field(
      'embedding',
      new arrow.FixedSizeList(
        embeddingDim,
        new arrow.Field('item', new arrow.Float32(), true),
      ),
    ),
  ]);

  const embeddingsIndex = await db.createEmptyTable(
    `embeddings-${embeddingDim}`,
    schema,
    {
      existOk: true,
      mode: 'create',
    },
  );

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

  const results = await processEmbeddings(processedTexts, options);

  if (!Array.isArray(results)) {
    throw new Error('Invalid response from Hugging Face API');
  }

  return results;
};

export const indexDatasetSources = async ({
  dataset,
  sources,
  options,
  maxChunks = 100,
}: {
  dataset: {
    id: string;
    name: string;
  };
  sources: WebSource[];
  options: {
    accessToken: string;
  };
  maxChunks?: number;
}): Promise<number> => {
  type DocumentRow = {
    text: string;
    source_uri: string;
    dataset_id: string;
    embedding?: number[];
  };

  const documents = sources
    .map((source) => {
      if (!source.markdownTree) return null;

      // Create metadata section
      const metadata = [];
      if (source.title) metadata.push(`# ${source.title}`);
      if (source.snippet) metadata.push(`> ${source.snippet}`);
      const metadataSection =
        metadata.length > 0 ? metadata.join('\n\n') + '\n\n' : '';

      // Get all h1 and h2 sections
      const sections: { header: HeaderElement; parent?: HeaderElement }[] = [];

      // First find all h1s
      const h1Sections = source.markdownTree.children.filter(
        (child) =>
          child.type === MarkdownElementType.Header &&
          (child as any).level === 1,
      ) as HeaderElement[];

      if (h1Sections.length === 0) {
        // No h1s found, use full document
        const mdElements = flattenTree(source.markdownTree);
        const content = mdElements.map(stringifyMarkdownElement).join('\n\n');
        const fullDocument = metadataSection + content;

        if (fullDocument.length <= 200) return null;

        return [
          {
            text: fullDocument,
            source_uri: source.url,
            dataset_id: dataset.id,
          },
        ] as DocumentRow[];
      }

      // For each h1, find its h2s and create documents
      for (const h1 of h1Sections) {
        // Add the h1 section itself
        sections.push({ header: h1 });

        // Find h2s under this h1
        const h2Sections = h1.children.filter(
          (child) =>
            child.type === MarkdownElementType.Header &&
            (child as any).level === 2,
        ) as HeaderElement[];

        // Add each h2 with its parent h1
        for (const h2 of h2Sections) {
          sections.push({ header: h2, parent: h1 });
        }
      }

      // Create documents for each section
      return sections
        .map(({ header, parent }) => {
          let document = metadataSection;

          // If this is an h2, include its parent h1 context
          if (parent) {
            document += `# ${parent.content}\n\n`;
          }

          // Add the section content
          document += markdownTreeToString(header);

          if (document.length <= 200) return null;

          return {
            text: document,
            source_uri: source.url,
            dataset_id: dataset.id,
          } as DocumentRow;
        })
        .filter((doc): doc is DocumentRow => doc !== null);
    })
    .filter((docs): docs is DocumentRow[] => docs !== null)
    .flat();

  let rows: DocumentRow[] = documents;

  // Limit the total number of documents if maxChunks is specified
  if (maxChunks && rows.length > maxChunks) {
    console.log(
      `[indexDatasetSources] Limiting documents from ${rows.length} to ${maxChunks} for dataset ${dataset.name}`,
    );
    rows = rows.slice(0, maxChunks);
  }

  const processEmbeddingsBatch = async (
    batch: DocumentRow[],
    batchIdx: number,
  ): Promise<DocumentRow[]> => {
    console.log(
      `Processing batch ${batchIdx} with ${batch.length} rows for dataset ${dataset.name}`,
    );
    const texts = batch.map((row) => row.text);

    try {
      const embeddings = await embedder(texts, options);

      batch.forEach((row, index) => {
        const embedding = embeddings[index];
        if (!embedding) {
          console.warn(
            `Skipping document due to missing embedding for text:\n${row.text}\n---END OF SKIPPED TEXT---`,
          );
          return;
        }

        row.embedding = embedding;
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

  const rowsWithEmbeddings: DocumentRow[] = [];
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
        .limit(3)
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
      .limit(3)
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

export const checkSourceExists = async ({
  dataset,
  sourceUri,
}: {
  dataset: {
    id: string;
  };
  sourceUri: string;
}): Promise<boolean> => {
  try {
    // Escape quotes in sourceUri to prevent SQL injection
    const escapedSourceUri = sourceUri.replace(/"/g, '\\"');
    const filterByDatasetAndSource = `dataset_id = "${dataset.id}" AND source_uri = "${escapedSourceUri}"`;
    const count = await embeddingsIndex.countRows(filterByDatasetAndSource);
    return count > 0;
  } catch (error) {
    console.error('Error checking if source exists:', error);
    // If there's an error checking, we should assume the source doesn't exist
    // This is safer than assuming it does exist and skipping it
    return false;
  }
};
