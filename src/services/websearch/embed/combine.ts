import { getSentenceSimilarity } from './similarity';
import type { EmbeddingModel, EmbeddingResult } from './types';

/**
 * Combines sentences together to reach the maximum character limit of the embedding model
 * Improves performance considerably when using CPU embedding
 */
export async function getCombinedSentenceSimilarity(
  embeddingModel: EmbeddingModel,
  query: string,
  sentences: string[],
): Promise<EmbeddingResult[]> {
  // Combine sentences into larger chunks to reduce the number of embeddings needed
  const combinedSentences = sentences.reduce<
    { text: string; indices: number[] }[]
  >((acc, sentence, idx) => {
    const lastSentence = acc[acc.length - 1];

    // If this is the first sentence or the last combined sentence would be too long,
    // start a new combined sentence
    if (
      !lastSentence ||
      lastSentence.text.length + sentence.length >=
        embeddingModel.chunkCharLength
    ) {
      // Create a new array without using spread on accumulator
      const newAcc = acc.slice();
      newAcc.push({ text: sentence, indices: [idx] });
      return newAcc;
    }

    // Otherwise, add the sentence to the last combined sentence
    lastSentence.text += ` ${sentence}`;
    lastSentence.indices.push(idx);
    return acc;
  }, []);

  // Get embeddings for the combined sentences
  const embeddings = await getSentenceSimilarity(
    embeddingModel,
    query,
    combinedSentences.map(({ text }) => text),
  );

  // Distribute the embeddings back to the original sentences
  return embeddings.flatMap((embedding, idx) => {
    const { indices } = combinedSentences[idx];

    // Each original sentence in this combined chunk gets the same embedding
    return indices.map((i) => ({
      ...embedding,
      idx: i,
    }));
  });
}
