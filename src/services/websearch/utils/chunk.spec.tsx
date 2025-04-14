import { describe, expect, it } from 'vitest';
import { flattenTree } from '../markdown';
import { scrapeUrlsBatch } from '../scrape';
import { type MarkdownElement, MarkdownElementType } from '../types';
import { chunkElements } from './chunk';

describe('chunkElements', () => {
  it('should handle empty input', () => {
    const result = chunkElements([], 100);
    expect(result).toEqual([]);
  });

  it('should handle single paragraph under max length', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Paragraph,
        content: 'This is a short paragraph.',
        parent: null,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual(elements);
  });

  it('should include headers with their content', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'Main Title',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'This is the content under the main title.',
        parent: null,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual([
      {
        type: MarkdownElementType.Paragraph,
        content: 'Main Title\nThis is the content under the main title.',
        parent: null,
      },
    ]);
  });

  it('should handle multiple headers with content', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'First Section',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'Content for first section.',
        parent: null,
      },
      {
        type: MarkdownElementType.Header,
        content: 'Second Section',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'Content for second section.',
        parent: null,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual([
      {
        type: MarkdownElementType.Paragraph,
        content: 'First Section\nContent for first section.',
        parent: null,
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'Second Section\nContent for second section.',
        parent: null,
      },
    ]);
  });

  it('should split long content while preserving header context', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'Long Section',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.Paragraph,
        content:
          'This is a very long paragraph that should be split into multiple chunks. Each chunk should still include the header context.',
        parent: null,
      },
    ];
    const result = chunkElements(elements, 50);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.content).toContain('Long Section');
    }
  });

  it('should handle nested headers and content', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'Main Section',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'Main content.',
        parent: null,
      },
      {
        type: MarkdownElementType.Header,
        content: 'Subsection',
        parent: null,
        level: 2,
        children: [],
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'Subsection content.',
        parent: null,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual([
      {
        type: MarkdownElementType.Paragraph,
        content: 'Main Section\nMain content.',
        parent: null,
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'Subsection\nSubsection content.',
        parent: null,
      },
    ]);
  });

  it('should handle content without headers', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Paragraph,
        content: 'This is content without a header.',
        parent: null,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual(elements);
  });

  it('should handle multiple paragraphs under the same header', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'Section',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'First paragraph.',
        parent: null,
      },
      {
        type: MarkdownElementType.Paragraph,
        content: 'Second paragraph.',
        parent: null,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual([
      {
        type: MarkdownElementType.Paragraph,
        content: 'Section\nFirst paragraph.\nSecond paragraph.',
        parent: null,
      },
    ]);
  });

  it('should keep unordered list items together', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'List Section',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '- First item',
        parent: null,
        depth: 1,
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '- Second item',
        parent: null,
        depth: 1,
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '- Third item',
        parent: null,
        depth: 1,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual([
      {
        type: MarkdownElementType.Paragraph,
        content: 'List Section\n\n- First item\n- Second item\n- Third item',
        parent: null,
      },
    ]);
  });

  it('should keep ordered list items together', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'Ordered List',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.OrderedListItem,
        content: '1. First step',
        parent: null,
        depth: 1,
      },
      {
        type: MarkdownElementType.OrderedListItem,
        content: '2. Second step',
        parent: null,
        depth: 1,
      },
      {
        type: MarkdownElementType.OrderedListItem,
        content: '3. Third step',
        parent: null,
        depth: 1,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual([
      {
        type: MarkdownElementType.Paragraph,
        content: 'Ordered List\n\n1. First step\n2. Second step\n3. Third step',
        parent: null,
      },
    ]);
  });

  it('should handle nested lists', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'Nested Lists',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '- Main item 1',
        parent: null,
        depth: 1,
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '  - Subitem 1.1',
        parent: null,
        depth: 2,
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '  - Subitem 1.2',
        parent: null,
        depth: 2,
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '- Main item 2',
        parent: null,
        depth: 1,
      },
    ];
    const result = chunkElements(elements, 100);
    expect(result).toEqual([
      {
        type: MarkdownElementType.Paragraph,
        content:
          'Nested Lists\n\n- Main item 1\n  - Subitem 1.1\n  - Subitem 1.2\n- Main item 2',
        parent: null,
      },
    ]);
  });

  it('should handle lists with long content', () => {
    const elements: MarkdownElement[] = [
      {
        type: MarkdownElementType.Header,
        content: 'Long List',
        parent: null,
        level: 1,
        children: [],
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content:
          '- This is a very long list item that should be split into multiple chunks while keeping the list structure intact.',
        parent: null,
        depth: 1,
      },
      {
        type: MarkdownElementType.UnorderedListItem,
        content: '- Another long item that should be properly chunked.',
        parent: null,
        depth: 1,
      },
    ];
    const result = chunkElements(elements, 50);
    expect(result.length).toBeGreaterThan(1);
    for (const chunk of result) {
      expect(chunk.content).toContain('Long List');
    }
  });
});

describe('Real website chunking integration', () => {
  it(
    'should show chunks from Goya Award Wikipedia page',
    async () => {
      const url = 'https://en.wikipedia.org/wiki/Goya_Award_for_Best_Film';

      // 1. Get the markdownTree using existing scraping
      const scrapedUrls = await scrapeUrlsBatch([url]);
      const scrappedContent = scrapedUrls.get(url);

      if (!scrappedContent?.markdownTree) {
        throw new Error('Failed to scrape page');
      }

      // 2. First flatten the tree to get elements
      const mdElements = flattenTree(scrappedContent.markdownTree);

      // 3. Use chunkElements to get proper chunks
      const chunks = chunkElements(mdElements, 2000);

      // Log all chunks for inspection
      console.log('\n=== Generated Chunks ===\n');
      chunks.forEach((chunk, i) => {
        console.log(`\n--- Chunk ${i + 1} ---\n${chunk.content}\n`);
      });

      // Log statistics
      console.log('\n=== Chunking Statistics ===');
      console.log(`Total chunks: ${chunks.length}`);
      console.log(
        `Average chunk length: ${chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length}`,
      );

      // Log award entries
      const awardChunks = chunks.filter((chunk) =>
        chunk.content.match(/\d{4}.*Goya Awards/),
      );
      console.log(
        `\n=== Sample Award Chunks (${awardChunks.length} found) ===\n`,
      );
      awardChunks.slice(0, 3).forEach((chunk, i) => {
        console.log(`\nAward Chunk ${i + 1}:\n${chunk.content}\n`);
      });
    },
    { timeout: 30000 },
  );
});
