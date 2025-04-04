import consola from 'consola';
import { stringifyMarkdownElement } from '../markdown/utils/stringify';
import type { ScrapedPage } from '../types';
import type { MarkdownElement } from '../types';
import { MarkdownElementType } from '../types';
import { getCombinedSentenceSimilarity } from './combine';
import { getSentenceSimilarity, innerProduct } from './similarity';
import { flattenTree } from './tree';
import type { EmbeddedSource, EmbeddingChunk, EmbeddingModel } from './types';

/**
 * Logger for the embed module
 */
const logger = consola.withTag('websearch:embed');

// Minimum and maximum character limits for context selection
const MIN_CHARS = 3000;
const SOFT_MAX_CHARS = 8000;

/**
 * Find the most relevant content from scraped sources based on a prompt
 */
export async function findContextSources(
  sources: { url: string; title: string; page: ScrapedPage }[],
  prompt: string,
  embeddingModel: EmbeddingModel,
): Promise<EmbeddedSource[]> {
  const startTime = Date.now();

  // Get all markdown elements from all sources
  const sourcesMarkdownElems = sources
    .filter((source) => source.page.markdownTree) // Only include sources with markdown trees
    .map((source) => flattenTree(source.page.markdownTree!));

  // Flatten all elements into a single array
  const markdownElems = sourcesMarkdownElems.flat();

  if (markdownElems.length === 0) {
    logger.warn('No markdown elements found in sources');
    return [];
  }

  logger.info(
    `Processing ${markdownElems.length} markdown elements from ${sources.length} sources`,
  );

  // Choose embedding function based on model characteristics
  const embeddingFunc =
    embeddingModel.endpoints[0].type === 'transformersjs'
      ? getCombinedSentenceSimilarity
      : getSentenceSimilarity;

  // Get stringified content of each markdown element
  const elemStrings = markdownElems.map(stringifyMarkdownElement);

  // Apply length limits if needed
  const limitedElemStrings = elemStrings.map((elem) =>
    elem.length > embeddingModel.chunkCharLength
      ? elem.slice(0, embeddingModel.chunkCharLength)
      : elem,
  );

  // Get embeddings and sort by relevance (lower distance = more relevant)
  const embeddings = await embeddingFunc(
    embeddingModel,
    prompt,
    limitedElemStrings,
  );

  const topEmbeddings = embeddings
    .sort((a, b) => a.distance - b.distance)
    // Filter out headers since they're generally not content-rich
    .filter(
      (embedding) =>
        markdownElems[embedding.idx].type !== MarkdownElementType.Header,
    );

  // Select the most relevant elements while tracking total characters
  let totalChars = 0;
  const selectedMarkdownElems = new Set<MarkdownElement>();
  const selectedEmbeddings: number[][] = [];

  for (const embedding of topEmbeddings) {
    const elem = markdownElems[embedding.idx];

    // Ignore elements that are too similar to already selected elements (deduplication)
    const tooSimilar = selectedEmbeddings.some(
      (selectedEmbedding) =>
        innerProduct(selectedEmbedding, embedding.embedding) < 0.01,
    );

    if (tooSimilar) continue;

    // Add element
    if (!selectedMarkdownElems.has(elem)) {
      selectedMarkdownElems.add(elem);
      selectedEmbeddings.push(embedding.embedding);
      totalChars += elem.content.length;
    }

    // Add element's parent (header) for context
    if (elem.parent && !selectedMarkdownElems.has(elem.parent)) {
      selectedMarkdownElems.add(elem.parent);
      totalChars += elem.parent.content.length;
    }

    // Stop if we've reached our soft max characters
    if (totalChars > SOFT_MAX_CHARS) break;

    // Stop if we've reached minimum chars and relevance is getting low
    if (totalChars > MIN_CHARS && embedding.distance > 0.25) break;
  }

  // Construct context for each source
  const contextSources = sourcesMarkdownElems
    .map((elems, idx) => {
      // Filter to only include selected elements
      const sourceSelectedElems = elems.filter((elem) =>
        selectedMarkdownElems.has(elem),
      );

      // No elements means this source wasn't relevant
      if (sourceSelectedElems.length === 0) return null;

      // Build context string from selected elements
      const context = sourceSelectedElems
        .map((elem) => elem.content)
        .join('\n');

      // Return source with embedded context
      const source = sources[idx];
      return {
        url: source.url || '',
        title: source.title,
        context,
      };
    })
    .filter(Boolean) as EmbeddedSource[]; // Filter out null values

  const duration = Date.now() - startTime;
  logger.info(
    `Found ${contextSources.length} relevant sources with ${totalChars} chars in ${duration}ms`,
  );

  return contextSources;
}

/**
 * Processes documents and creates embeddings for their content
 * without filtering for relevance
 */
export async function createEmbeddings(
  sources: { url: string; title: string; page: ScrapedPage }[],
  embeddingModel: EmbeddingModel,
): Promise<{ url: string; title: string; chunks: EmbeddingChunk[] }[]> {
  const startTime = Date.now();

  // Get all markdown elements from all sources
  const sourcesWithMarkdown = sources.filter(
    (source) => source.page.markdownTree,
  ); // Only include sources with markdown trees

  if (sourcesWithMarkdown.length === 0) {
    logger.warn('No markdown trees found in sources');
    return [];
  }

  logger.info(`Processing ${sourcesWithMarkdown.length} sources for embedding`);

  // Process each source individually to maintain document boundaries
  const embeddedSources = await Promise.all(
    sourcesWithMarkdown.map(async (source) => {
      // Flatten the markdown tree to get a list of elements
      const elements = flattenTree(source.page.markdownTree!);

      // Extract text content from elements
      const elemStrings = elements.map(stringifyMarkdownElement);

      // Apply length limits if needed
      const limitedElemStrings = elemStrings.map((elem) =>
        elem.length > embeddingModel.chunkCharLength
          ? elem.slice(0, embeddingModel.chunkCharLength)
          : elem,
      );

      // Generate embeddings for all elements
      const embeddings = await embeddingModel.embed(limitedElemStrings);

      // Create chunks with their embeddings
      const chunks: EmbeddingChunk[] = elements.map((elem, idx) => {
        // Get parent header text for context
        const parentText = elem.parent?.content || '';

        return {
          text: limitedElemStrings[idx],
          embedding: embeddings[idx],
          type: elem.type,
          parentHeader: parentText,
          metadata: {
            position: idx,
            elementType: elem.type,
          },
        };
      });

      return {
        url: source.url,
        title: source.title,
        chunks,
      };
    }),
  );

  const duration = Date.now() - startTime;
  const totalChunks = embeddedSources.reduce(
    (sum, source) => sum + source.chunks.length,
    0,
  );

  logger.info(
    `Created embeddings for ${totalChunks} chunks across ${embeddedSources.length} sources in ${duration}ms`,
  );

  return embeddedSources;
}
