import { describe, expect, it } from 'vitest';
import '@lancedb/lancedb/embedding/openai';
import { MarkdownElementType } from '../types';
import { embedder, indexDatasetSources } from './engine';

const accessToken = process.env.HF_TOKEN!;
describe(
  'search engine',
  () => {
    it('should embed some data', async () => {
      const embeddings = await embedder(['hello world', 'goodbye world'], {
        accessToken,
      });

      console.log('embeddings', embeddings);

      // Check that the embeddings are of the expected shape
      expect(embeddings).toHaveLength(2);
    });

    it('should index a dataset web source', async () => {
      const indexedItems = await indexDatasetSources({
        dataset: {
          id: 'my-test_dataset',
          name: 'my-test_dataset',
        },
        sources: [
          {
            url: 'https://example.com',
            title: 'Example',
            contentType: 'web',
            markdownTree: undefined,
          },
        ],
        options: {
          accessToken,
        },
      });

      expect(indexedItems).toBe(0);
    });

    it('should index a dataset web source with markdown tree', async () => {
      const indexedItems = await indexDatasetSources({
        dataset: {
          id: 'my-test_dataset',
          name: 'my-test_dataset',
        },
        sources: [
          {
            url: 'https://example.com',
            title: 'Example',
            contentType: 'web',
            markdownTree: {
              type: MarkdownElementType.Header,
              level: 0,
              content: 'Example',
              children: [
                {
                  type: MarkdownElementType.Paragraph,
                  content: 'This is an example paragraph.',
                  parent: null,
                },
              ],
              parent: null,
            },
          },
        ],
        options: {
          accessToken,
        },
      });

      expect(indexedItems).toBe(2);
    });
  },
  {
    timeout: 100_000,
  },
);
