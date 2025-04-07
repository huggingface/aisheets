import { describe, expect, it } from 'vitest';
import { TransformersJSEmbeddingModel } from './transformers';

describe('TransformersJSEmbeddingModel', () => {
  it('should generate embeddings using TransformersJSEmbeddingModel', async () => {
    const model = new TransformersJSEmbeddingModel('Xenova/gte-small');
    console.log('Created model with name:', model.name);

    const texts = ['This is a test sentence.'];
    const embeddings = await model.embed(texts);

    console.log('Generated embeddings:', embeddings);
    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(1);
    expect(embeddings[0].length).toBe(384);
  }, 30000);
});
