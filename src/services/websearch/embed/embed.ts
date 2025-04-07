import consola from 'consola';
import { stringifyMarkdownElement } from '../markdown/utils/stringify';
import type { ScrapedPage } from '../types';
import type { HeaderElement, MarkdownElement } from '../types';
import { MarkdownElementType } from '../types';
import { getCombinedSentenceSimilarity } from './combine';
import { getSentenceSimilarity, innerProduct } from './similarity';
import { TransformersJSEmbeddingModel } from './transformers';
import { flattenTree } from './tree';
import type { EmbeddedSource, EmbeddingChunk, EmbeddingModel } from './types';

/**
 * Logger for the embed module
 */
const logger = consola.withTag('websearch:embed');

// Minimum and maximum character limits for context selection
const MIN_CHARS = 100;
const SOFT_MAX_CHARS = 1000;
const SIMILARITY_THRESHOLD = 0.25;

// Create a single instance of the embedding model
const embeddingModel = new TransformersJSEmbeddingModel();

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
    .filter((source) => source.page.markdownTree)
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

  // Get embeddings and sort by relevance
  const embeddings = await embeddingFunc(
    embeddingModel,
    prompt,
    limitedElemStrings,
  );

  const topEmbeddings = embeddings
    .sort((a, b) => a.distance - b.distance)
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

    // Ignore elements that are too similar to already selected elements
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
    .filter(Boolean) as EmbeddedSource[];

  const duration = Date.now() - startTime;
  logger.info(
    `Found ${contextSources.length} relevant sources with ${totalChars} chars in ${duration}ms`,
  );

  return contextSources;
}

/**
 * Processes documents and creates embeddings for their content
 */
export async function createEmbeddings(
  sources: { url: string; title: string; page: ScrapedPage }[],
  embeddingModel: EmbeddingModel,
): Promise<{ url: string; title: string; chunks: EmbeddingChunk[] }[]> {
  const startTime = Date.now();

  // Get all markdown elements from all sources
  const sourcesWithMarkdown = sources.filter(
    (source) => source.page.markdownTree,
  );

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

      // Filter out headers and similar embeddings
      const selectedElements = new Set<MarkdownElement>();
      const selectedEmbeddings: number[][] = [];
      let discardedCount = 0;

      // Sort embeddings by distance (lower is better)
      const sortedEmbeddings = embeddings
        .map((embedding, idx) => ({
          embedding,
          idx,
          element: elements[idx],
        }))
        .sort((a, b) => {
          // Calculate distance using inner product
          const distA = innerProduct(a.embedding, a.embedding);
          const distB = innerProduct(b.embedding, b.embedding);
          return distA - distB;
        });

      for (const { embedding, idx, element } of sortedEmbeddings) {
        // Skip headers
        if (element.type === MarkdownElementType.Header) {
          discardedCount++;
          continue;
        }

        // Check for similarity with already selected embeddings
        const tooSimilar = selectedEmbeddings.some(
          (selectedEmbedding) =>
            innerProduct(selectedEmbedding, embedding) < 0.01,
        );

        if (tooSimilar) {
          discardedCount++;
          continue;
        }

        // Add element and its embedding
        selectedElements.add(element);
        selectedEmbeddings.push(embedding);

        // Add parent header if exists
        if (element.parent) {
          selectedElements.add(element.parent);
        }
      }

      logger.info(
        `Filtered ${discardedCount}/${elements.length} embeddings for source ${source.url}`,
      );

      // Create chunks with their embeddings
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

export async function selectRelevantContext(
  query: string,
  sources: { url: string; embeddingChunks: EmbeddingChunk[] }[],
): Promise<{ url: string; elements: MarkdownElement[] }[]> {
  try {
    const queryEmbedding = await embeddingModel.embed([query]);
    const results = sources.map((source) => {
      const embeddings = source.embeddingChunks.map((chunk) => ({
        chunk,
        similarity: innerProduct(queryEmbedding[0], chunk.embedding),
      }));

      const selectedElements = new Set<MarkdownElement>();
      let totalChars = 0;

      for (const { chunk, similarity } of embeddings.sort(
        (a, b) => b.similarity - a.similarity,
      )) {
        if (totalChars > SOFT_MAX_CHARS) break;
        if (totalChars > MIN_CHARS && similarity < SIMILARITY_THRESHOLD) break;

        if (
          chunk.type === MarkdownElementType.Paragraph ||
          chunk.type === MarkdownElementType.UnorderedList ||
          chunk.type === MarkdownElementType.OrderedList ||
          chunk.type === MarkdownElementType.CodeBlock ||
          chunk.type === MarkdownElementType.Code ||
          chunk.type === MarkdownElementType.Link ||
          chunk.type === MarkdownElementType.Image ||
          chunk.type === MarkdownElementType.Table
        ) {
          const element: MarkdownElement = {
            type: chunk.type,
            content: chunk.text,
            parent: chunk.parentHeader
              ? ({
                  type: MarkdownElementType.Header,
                  content: chunk.parentHeader,
                } as HeaderElement)
              : null,
          };

          selectedElements.add(element);
          totalChars += chunk.text.length;
        }
      }

      return {
        url: source.url,
        elements: Array.from(selectedElements),
      };
    });

    return results;
  } catch (error) {
    logger.error('Error selecting relevant context:', error);
    throw error;
  }
}
