import { featureExtraction } from '@huggingface/inference';
import * as lancedb from '@lancedb/lancedb';
import * as arrow from 'apache-arrow';
import { VECTOR_DB_DIR } from '~/config';
import type { WebSource } from '~/services/websearch/search-sources';
import { flattenTree, stringifyMarkdownElement } from '../markdown';

import { isDev } from '@builder.io/qwik';

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
        384,
        new arrow.Field('item', new arrow.Float32(), true),
      ),
    ),
  ]);

  const embeddingsIndex = isDev
    ? await db.createEmptyTable('embeddings.dev', schema, {
        mode: 'overwrite',
      })
    : await db.createEmptyTable('embeddings', schema, {
        existOk: true,
        mode: 'create',
      });

  await embeddingsIndex.createIndex('dataset_id', { replace: true });

  return {
    db,
    embeddingsIndex,
  };
};

const { embeddingsIndex, db } = await configureEmbeddingsIndex();

export const deleteIndex = async () => {
  await db.dropTable(embeddingsIndex.name);
};

export const embedder = async (
  texts: string[],
  options: {
    accessToken: string;
  },
): Promise<number[][]> => {
  if (texts.length === 0) return [];

  const results = await featureExtraction({
    inputs: texts,
    accessToken: options.accessToken,
    model: 'BAAI/bge-small-en-v1.5',
    provider: 'hf-inference',
  });

  if (!Array.isArray(results)) {
    throw new Error('Invalid response from Hugging Face API');
  }

  return results as number[][]; // TODO: How to control the type of this?
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

        const mdElements = flattenTree(source.markdownTree);
        const textChunks = mdElements.map(stringifyMarkdownElement);

        const embeddings = await embedder(textChunks, options);

        return textChunks.map((text, index) => {
          const embedding = embeddings[index];

          return {
            text,
            embedding,
            source_uri: source.url,
            dataset_id: dataset.id,
          };
        });
      }),
    )
  ).flat();

  await embeddingsIndex.add(indexData);

  return indexData.length;
};

export const queryDatasetSources = async ({
  dataset,
  query,
  options,
}: {
  dataset: {
    id: string;
  };
  query: string;
  options: {
    accessToken: string;
  };
}): Promise<
  {
    text: string;
    source_uri: string;
  }[]
> => {
  const embeddings = await embedder([query], options);

  const results = await embeddingsIndex
    .search(embeddings[0], 'vector')
    .where(`dataset_id = "${dataset.id}"`)
    .limit(10)
    .toArray();

  return results.map((result) => ({
    text: result.text,
    source_uri: result.source_uri,
  }));
};
