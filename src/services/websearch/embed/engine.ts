import { featureExtraction } from '@huggingface/inference';
import * as lancedb from '@lancedb/lancedb';
import * as arrow from 'apache-arrow';
import { VECTOR_DB_DIR } from '~/config';
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
        1024,
        new arrow.Field('item', new arrow.Float32(), true),
      ),
    ),
  ]);

  const embeddingsIndex = await db.createEmptyTable('embeddings', schema, {
    existOk: true,
    mode: 'create',
  });

  return {
    db,
    embeddingsIndex,
  };
};

const { embeddingsIndex } = await configureEmbeddingsIndex();

export const embedder = async (
  texts: string[],
  options: {
    accessToken: string;
  },
): Promise<number[]> => {
  if (texts.length === 0) return [];

  const results = await featureExtraction({
    inputs: texts,
    accessToken: options.accessToken,
    model: 'mixedbread-ai/mxbai-embed-large-v1',
    provider: 'hf-inference',
  });

  if (!Array.isArray(results)) {
    throw new Error('Invalid response from Hugging Face API');
  }

  return results as number[]; // TODO: How to control the type of this?
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
