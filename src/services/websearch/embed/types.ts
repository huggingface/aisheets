/**
 * Represents a vector embedding
 */
export type Embedding = number[];

/**
 * Embedding distance and metadata
 */
export interface EmbeddingResult {
  distance: number;
  embedding: Embedding;
  idx: number;
}

/**
 * Embedding model interface
 */
export interface EmbeddingModel {
  // Basic model information
  name: string;
  provider: string;
  chunkCharLength: number;

  // Prefixes for query and passage inputs
  preQuery: string;
  prePassage: string;

  // Model type information
  endpoints: Array<{
    type: string; // "transformersjs", "inference providers", etc.
  }>;

  // Method to embed text
  embed(texts: string[]): Promise<Embedding[]>;
}

/**
 * Enhanced search result with embedded context
 */
export interface EmbeddedSource {
  url: string;
  title: string;
  context: string;
}

/**
 * Represents a chunk of text with its embedding vector
 */
export interface EmbeddingChunk {
  text: string;
  embedding: Embedding;
  type: string;
  parentHeader?: string;
  metadata?: Record<string, any>;
}

/**
 * Mock implementation of embedding model for development
 */
export class MockEmbeddingModel implements EmbeddingModel {
  name = 'mock-embedding-model';
  provider = 'mock';
  chunkCharLength = 1000;

  // Used to identify query vs passage in embedding
  preQuery = 'query: ';
  prePassage = 'passage: ';

  // Model type information
  endpoints = [
    { type: 'transformersjs' }, // For combined sentence embedding
  ];

  /**
   * Creates mock embeddings for the given texts
   */
  async embed(texts: string[]): Promise<Embedding[]> {
    // Create a deterministic mock embedding for each text
    return texts.map((text) => {
      // Simple hashing function to create mock embeddings
      const hash = Array.from(text).reduce(
        (acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000,
        0,
      );

      // Create a 768-dimensional vector with some variation based on the hash
      return Array(768)
        .fill(0)
        .map(
          (_, i) => (Math.sin(hash + i) + 1) / 2, // Values between 0 and 1
        );
    });
  }
}
