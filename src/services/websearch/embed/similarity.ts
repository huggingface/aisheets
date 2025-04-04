import type { Embedding, EmbeddingModel, EmbeddingResult } from './types';

/**
 * Calculate the dot product between two embeddings
 */
export function dotProduct(
  embeddingA: Embedding,
  embeddingB: Embedding,
): number {
  if (embeddingA.length !== embeddingB.length) {
    throw new Error('Embeddings must have the same dimensions');
  }

  return embeddingA.reduce((sum, a, i) => sum + a * embeddingB[i], 0);
}

/**
 * Calculate the inner product distance between two embeddings
 * This is 1.0 - dot product, which makes smaller values = more similar
 */
export function innerProduct(
  embeddingA: Embedding,
  embeddingB: Embedding,
): number {
  return 1.0 - dotProduct(embeddingA, embeddingB);
}

/**
 * Get embeddings and calculate similarity between a query and sentences
 */
export async function getSentenceSimilarity(
  embeddingModel: EmbeddingModel,
  query: string,
  sentences: string[],
): Promise<EmbeddingResult[]> {
  // Prepare inputs with any required prefixes
  const inputs = [
    `${embeddingModel.preQuery}${query}`,
    ...sentences.map((sentence) => `${embeddingModel.prePassage}${sentence}`),
  ];

  // Get embeddings for all inputs
  const embeddings = await embeddingModel.embed(inputs);

  // The first embedding is the query
  const queryEmbedding = embeddings[0];
  // The rest are sentence embeddings
  const sentenceEmbeddings = embeddings.slice(1);

  // Calculate distance and return results
  return sentenceEmbeddings.map((sentenceEmbedding, idx) => ({
    distance: innerProduct(queryEmbedding, sentenceEmbedding),
    embedding: sentenceEmbedding,
    idx,
  }));
}
