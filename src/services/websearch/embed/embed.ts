import consola from 'consola';
import { stringifyMarkdownElement } from '../markdown/utils/stringify';
import type { ScrapedPage } from '../types';
import type { MarkdownElement } from '../types';
import { MarkdownElementType } from '../types';
import { innerProduct } from './similarity';
import { flattenTree } from './tree';
import type { EmbeddingChunk, EmbeddingModel } from './types';

/**
 * Logger for the embed module
 */
const logger = consola.withTag('websearch:embed');

/**
 * Processes documents and creates embeddings for their content
 */
export async function createEmbeddings(
  sources: { url: string; title: string; page: ScrapedPage }[],
  embeddingModel: EmbeddingModel,
): Promise<{ url: string; title: string; chunks: EmbeddingChunk[] }[]> {
  const sourcesWithMarkdown = sources.filter(
    (source) => source.page.markdownTree,
  );

  if (sourcesWithMarkdown.length === 0) {
    logger.warn('No markdown trees found in sources');
    return [];
  }

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
}
