import { createEmbeddings } from './embed/embed';
import { TransformersJSEmbeddingModel } from './embed/transformers';
import { scrapeUrlsBatch } from './scrape';
import { SerperSearch } from './search';
import type { ScrapedPage } from './types';

// Initialize embedding model immediately
const embeddingModel = new TransformersJSEmbeddingModel();
console.log('✅ [Search] Embedding model initialized');

export interface Source {
  title?: string;
  url?: string;
  snippet?: string;
  content?: string;
  contentType?: string; // 'web', 'pdf', 'docx', etc.
  markdownTree?: any;
  chunks?: Array<{
    text: string;
    embedding?: number[];
    type?: string;
    parentHeader?: string;
    metadata?: Record<string, any>;
  }>;
}

export async function collectSearchSources(
  queries: string[],
): Promise<Source[]> {
  // Service handles API key internally
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return [
      {
        title: 'Search Error',
        snippet: 'Search service not configured. Missing API key.',
        contentType: 'error',
      },
    ];
  }

  const serper = new SerperSearch(apiKey);
  const sources: Source[] = [];

  // Collect all search results and convert them to Sources
  for (const query of queries) {
    try {
      const searchResults = await serper.search(query);
      const webSources = searchResults.map((result) => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        contentType: 'web',
      }));
      sources.push(...webSources);
    } catch (error) {
      sources.push({
        title: 'Search Error',
        snippet: `Failed to search for "${query}": ${error instanceof Error ? error.message : String(error)}`,
        contentType: 'error',
      });
    }
  }

  // Deduplicate by URL if present
  const uniqueSources = Array.from(
    new Map(
      sources.map((source) => [source.url || source.title, source]),
    ).values(),
  );

  // Enrich with content
  const urlsToScrape = uniqueSources
    .filter((source) => source.url)
    .map((source) => source.url!);

  if (urlsToScrape.length > 0) {
    console.log(
      `🔍 [Search] Starting parallel scraping of ${urlsToScrape.length} URLs`,
    );
    const scrapedResults = await scrapeUrlsBatch(urlsToScrape);

    // Merge scraped results back into sources
    for (const source of uniqueSources) {
      if (source.url) {
        const scraped = scrapedResults.get(source.url);
        if (scraped) {
          source.content = scraped.content;
          source.markdownTree = scraped.markdownTree;
        }
      }
    }
    console.log(`✅ [Search] Completed scraping ${scrapedResults.size} URLs`);
  }

  // Create embeddings for all valid sources
  console.log('🔧 [Search] Starting embedding process...');
  try {
    const sourcesForEmbedding = uniqueSources
      .filter((source) => source.content && source.url && source.markdownTree)
      .map((source) => ({
        url: source.url!,
        title: source.title || 'Untitled',
        page: {
          title: source.title || 'Untitled',
          content: source.content!,
          markdownTree: source.markdownTree,
          siteName: undefined,
          author: undefined,
          description: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        } as ScrapedPage,
      }));

    console.log(
      `📊 [Search] Found ${sourcesForEmbedding.length} sources to embed`,
    );

    const embeddedSources = await createEmbeddings(
      sourcesForEmbedding,
      embeddingModel,
    );

    console.log(
      `✅ [Search] Successfully embedded ${embeddedSources.length} sources`,
    );

    // Merge embeddings back into sources
    for (const embeddedSource of embeddedSources) {
      const sourceToEnhance = uniqueSources.find(
        (s) => s.url === embeddedSource.url,
      );
      if (sourceToEnhance) {
        sourceToEnhance.chunks = embeddedSource.chunks;
        console.log(
          `📝 [Search] Added ${embeddedSource.chunks.length} chunks to source: ${sourceToEnhance.url}`,
        );
      }
    }
  } catch (error) {
    console.error('❌ [Search] Error creating embeddings:', error);
  }

  return uniqueSources;
}
