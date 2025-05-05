import { afterAll, describe, expect, it } from 'vitest';
import '@lancedb/lancedb/embedding/openai';
import { randomUUID } from 'node:crypto';
import type { WebSource } from '../search-sources';
import { MarkdownElementType } from '../types';
import {
  deleteIndex,
  embedder,
  indexDatasetSources,
  queryDatasetSources,
} from './engine';

afterAll(async () => {
  await deleteIndex();
});

const accessToken = process.env.HF_TOKEN!;
describe(
  'search engine',
  () => {
    it('should embed some data', async () => {
      const embeddings = await embedder(['hello world', 'goodbye world'], {
        accessToken,
      });

      expect(embeddings).toHaveLength(2);
    });

    it('should index a dataset web source', async () => {
      const indexedItems = await indexDatasetSources({
        dataset: {
          id: randomUUID(),
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
          id: randomUUID(),
          name: 'test dataset',
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

    it("should return a matched dataset's web source when querying", async () => {
      const dataset = {
        id: randomUUID(),
        name: 'my-test_dataset',
      };

      const sources = [
        {
          url: 'https://example.com',
          title: 'Example',
          contentType: 'web',
          markdownTree: {
            type: MarkdownElementType.Header,
            level: 0,
            content: 'Title',
            children: [
              {
                type: MarkdownElementType.Paragraph,
                content: 'hello world',
                parent: null,
              },
              {
                type: MarkdownElementType.Paragraph,
                content: 'goodby world',
                parent: null,
              },
            ],
            parent: null,
          },
        },
      ] as WebSource[];

      await indexDatasetSources({
        dataset,
        sources,
        options: {
          accessToken,
        },
      });

      const results = await queryDatasetSources({
        dataset,
        query: 'greetings',
        options: { accessToken },
      });

      const mostSimilar = results[0];

      expect(mostSimilar.text).toBe('hello world\n\n');
    });
  },

  {
    timeout: 100_000,
  },
);
