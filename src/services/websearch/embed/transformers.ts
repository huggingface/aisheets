import { pipeline } from '@huggingface/transformers';
import type {
  FeatureExtractionPipeline,
  Tensor,
} from '@huggingface/transformers';
import consola from 'consola';
import { stringifyMarkdownElement } from '../markdown/utils/stringify';
import type { MarkdownElement, ScrapedPage } from '../types';
import { MarkdownElementType } from '../types';
import { innerProduct } from './similarity';
import { flattenTree } from './tree';
import type { Embedding, EmbeddingChunk, EmbeddingModel } from './types';

/**
 * Logger for transformers module
 */
const logger = consola.withTag('websearch:transformers');

let modelInstance: Promise<FeatureExtractionPipeline> | null = null;
let modelInstances: any[] = [];
const MODEL_NAME = 'Xenova/gte-small';

async function getModelInstance(): Promise<FeatureExtractionPipeline> {
  if (modelInstance) return modelInstance;

  modelInstance = pipeline('feature-extraction', MODEL_NAME, {
    revision: 'main',
  }) as unknown as Promise<FeatureExtractionPipeline>;

  return modelInstance;
}

async function disposeModelInstance(): Promise<void> {
  if (!modelInstance) return;

  try {
    await (await modelInstance).dispose();
  } catch (error) {
    logger.error('Error disposing pipeline:', error);
  }
  modelInstance = null;
}

/**
 * Calculate embeddings for a set of inputs using transformers.js
 */
async function calculateEmbedding(inputs: string[]): Promise<Embedding[]> {
  const extractor = await getModelInstance();
  const output: Tensor = await extractor(inputs, {
    pooling: 'mean',
    normalize: true,
  });
  return output.tolist() as Embedding[];
}

/**
 * An embedding model implementation using Transformers.js
 */
export class TransformersJSEmbeddingModel implements EmbeddingModel {
  name = MODEL_NAME;
  provider = 'transformers.js';
  chunkCharLength = 512;
  preQuery = '';
  prePassage = '';
  endpoints = [{ type: 'transformersjs' }];

  async embed(texts: string[]): Promise<Embedding[]> {
    try {
      return await calculateEmbedding(texts);
    } catch (error: any) {
      logger.error(`Failed to generate embeddings: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Processes documents and creates embeddings for their content
 */
export async function createEmbeddings(
  sources: { url: string; title: string; page: ScrapedPage }[],
  embeddingModel: EmbeddingModel,
): Promise<{ url: string; title: string; chunks: EmbeddingChunk[] }[]> {
  const startTime = Date.now();
  const sourcesWithMarkdown = sources.filter(
    (source) => source.page.markdownTree,
  );

  if (sourcesWithMarkdown.length === 0) {
    logger.warn('No markdown trees found in sources');
    return [];
  }

  try {
    const embeddedSources = [];
    for (const source of sourcesWithMarkdown) {
      try {
        const elements = flattenTree(source.page.markdownTree!);
        const elemStrings = elements.map(stringifyMarkdownElement);
        const limitedElemStrings = elemStrings.map((elem) =>
          elem.length > embeddingModel.chunkCharLength
            ? elem.slice(0, embeddingModel.chunkCharLength)
            : elem,
        );

        const embeddings = await embeddingModel.embed(limitedElemStrings);
        const selectedElements = new Set<MarkdownElement>();
        const selectedEmbeddings: number[][] = [];

        const sortedEmbeddings = embeddings
          .map((embedding, idx) => ({
            embedding,
            idx,
            element: elements[idx],
            distance: innerProduct(embedding, embedding),
          }))
          .sort((a, b) => a.distance - b.distance);

        for (const { embedding, idx, element } of sortedEmbeddings) {
          if (element.type === MarkdownElementType.Header) continue;

          const tooSimilar = selectedEmbeddings.some(
            (selectedEmbedding) =>
              innerProduct(selectedEmbedding, embedding) < 0.01,
          );
          if (tooSimilar) continue;

          selectedElements.add(element);
          selectedEmbeddings.push(embedding);
          if (element.parent) selectedElements.add(element.parent);
        }

        const chunks: EmbeddingChunk[] = Array.from(selectedElements).map(
          (elem) => {
            const idx = elements.indexOf(elem);
            return {
              text: limitedElemStrings[idx],
              embedding: embeddings[idx],
              type: elem.type,
              parentHeader: elem.parent?.content || '',
              metadata: {
                position: idx,
                elementType: elem.type,
              },
            };
          },
        );

        embeddedSources.push({ url: source.url, title: source.title, chunks });
      } catch (error) {
        logger.error(`Error processing source ${source.url}:`, error);
      }
    }

    return embeddedSources;
  } finally {
    // Don't dispose here - let the application handle disposal
  }
}

// Export a function to clean up the model when the application shuts down
export async function cleanup(): Promise<void> {
  await disposeModelInstance();
}

export function disposeTransformersModels() {
  for (const model of modelInstances) {
    try {
      model.dispose();
    } catch (error) {
      logger.error('Error disposing model:', error);
    }
  }
  modelInstances = [];
}
