import type { SerializedHTMLElement } from '../types';

/**
 * Options for the DBSCAN clustering algorithm
 */
interface DBSCANOptions<T> {
  dataset: T[];
  epsilon?: number;
  epsilonCompare?: (distance: number, epsilon: number) => boolean;
  minimumPoints?: number;
  distanceFunction: (a: T, b: T) => number;
}

/**
 * A basic spatial parser for extracting HTML structure from pages
 * This is a simplified version of what HuggingFace might be using
 */
export function spatialParser(): {
  title: string;
  siteName?: string;
  author?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  elements: SerializedHTMLElement[];
  metrics: {
    clusterCount: number;
  };
} {
  // Define constants first
  const IgnoredTagsList = [
    'footer',
    'nav',
    'aside',
    'script',
    'style',
    'noscript',
    'form',
    'button',
  ];

  const InlineTags = [
    'a',
    'abbrv',
    'span',
    'address',
    'time',
    'acronym',
    'strong',
    'b',
    'br',
    'sub',
    'sup',
    'tt',
    'var',
    'em',
    'i',
  ];

  // Helper functions that need to be defined before use
  const findCriticalClusters = (clusters: number[][]) => {
    // Early exit for empty clusters
    if (clusters.length === 0) return [];

    // Calculate total text length once
    const totalText = totalTextLength(clusters.flat());
    if (totalText === 0) return [];

    // Process clusters in a single pass
    const clusterMetrics = clusters.map((cluster) => ({
      cluster,
      centrality: clusterCentrality(cluster),
      textShare: percentageTextShare(cluster, totalText),
    }));

    // Early exit for dominant cluster
    const dominantCluster = clusterMetrics[0];
    if (dominantCluster?.textShare > 60) {
      return [dominantCluster.cluster];
    }

    // Sort and filter in a single pass
    const sortedClusters = clusterMetrics
      .filter((c) => c.textShare >= 2)
      .sort((a, b) => {
        const penaltyA = 0.9 ** (a.centrality / 100);
        const penaltyB = 0.9 ** (b.centrality / 100);
        return b.textShare * penaltyB - a.textShare * penaltyA;
      });

    // Early exit if no significant clusters
    if (sortedClusters.length === 0) return [];

    // Find large clusters in a single pass
    const largeClusters = sortedClusters.filter((c) =>
      approximatelyEqual(c.textShare, sortedClusters[0].textShare, 10),
    );

    const totalLargeShare = largeClusters.reduce(
      (sum, c) => sum + c.textShare,
      0,
    );
    if (totalLargeShare > 60) {
      return largeClusters.map((c) => c.cluster);
    }

    // Collect critical clusters with early exit
    let totalShare = 0;
    const criticalClusters = [];
    for (const cluster of sortedClusters) {
      if (totalShare > 60) break;
      criticalClusters.push(cluster.cluster);
      totalShare += cluster.textShare;
    }

    return totalShare >= 60 ? criticalClusters : [];
  };

  // Cache DOM queries that are used multiple times
  const documentBody = document.body;
  if (!documentBody) throw new Error('Page failed to load');

  // Pre-compute these selectors once
  const possibleCodeParents = Array.from(document.querySelectorAll('pre, p'));
  const possibleTableParents = Array.from(document.querySelectorAll('table'));
  const possibleListParents = Array.from(document.querySelectorAll('ul, ol'));
  const barredNodes = new Set(
    document.querySelectorAll(IgnoredTagsList.join(',')),
  );

  // Original DBSCAN implementation without spatial grid
  const DBSCAN = <T>({
    dataset,
    epsilon = 1,
    epsilonCompare = (distance: number, eps: number) => distance < eps,
    minimumPoints = 2,
    distanceFunction,
  }: DBSCANOptions<T>) => {
    const visitedIndices = new Set<number>();
    const clusteredIndices = new Set<number>();
    const noise: number[] = [];
    const clusters: number[][] = [];

    const findNeighbors = (index: number) => {
      const neighbors: number[] = [];
      for (let i = 0; i < dataset.length; i++) {
        if (i !== index) {
          const distance = distanceFunction(dataset[index], dataset[i]);
          if (epsilonCompare(distance, epsilon)) {
            neighbors.push(i);
          }
        }
      }
      return neighbors;
    };

    const uniqueMerge = <U>(targetArray: U[], sourceArray: U[]) => {
      for (let i = 0; i < sourceArray.length; i += 1) {
        const item = sourceArray[i];
        if (targetArray.indexOf(item) < 0) {
          targetArray.push(item);
        }
      }
    };

    const expandCluster = (c: number, neighbors: number[]) => {
      for (let i = 0; i < neighbors.length; i += 1) {
        const neighborIndex = neighbors[i];
        if (!visitedIndices.has(neighborIndex)) {
          visitedIndices.add(neighborIndex);
          const secondaryNeighbors = findNeighbors(neighborIndex);
          if (secondaryNeighbors.length >= minimumPoints) {
            uniqueMerge(neighbors, secondaryNeighbors);
          }
        }
        if (!clusteredIndices.has(neighborIndex)) {
          clusteredIndices.add(neighborIndex);
        }
      }
    };

    dataset.forEach((element: T, index: number) => {
      if (!visitedIndices.has(index)) {
        visitedIndices.add(index);
        const neighbors = findNeighbors(index);
        if (neighbors.length < minimumPoints) {
          noise.push(index);
        } else {
          const clusterIndex = clusters.length;
          clusters.push(neighbors);
          expandCluster(clusterIndex, neighbors);
        }
      }
    });

    return { clusters, noise };
  };

  type ReadableNode = HTMLElement;
  type NodeWithRect = { node: ReadableNode; rect: DOMRect };

  const isOnlyChild = (node: Node) => {
    if (!node.parentElement) return true;
    if (node.parentElement.nodeName === 'body') return false;
    if (node.parentElement.childNodes.length === 1) return true;
    return false;
  };

  const hasValidInlineParent = (node: Node) => {
    return (
      node.parentElement &&
      !node.parentElement.matches('div, section, article, main, body ')
    );
  };

  const hasValidParent = (node: Node) => {
    return node.parentElement && !node.parentElement.isSameNode(document.body);
  };

  const findHighestDirectParentOfReadableNode = (node: Node): HTMLElement => {
    let parent = node.parentElement;

    while (
      parent &&
      hasValidInlineParent(parent) &&
      InlineTags.includes(parent?.tagName.toLowerCase())
    ) {
      parent = parent.parentElement;
    }

    while (parent && isOnlyChild(parent)) {
      if (!hasValidParent(parent)) break;
      parent = parent.parentElement;
    }

    if (!parent) {
      throw new Error('Disconnected node found during DOM traversal');
    }

    if (['span', 'code', 'div'].includes(parent.nodeName.toLowerCase())) {
      const hasParent = possibleCodeParents.find((tag: Element) =>
        tag.contains(parent),
      ) as HTMLElement;
      if (hasParent) {
        parent = hasParent;
      }
    }

    if (parent.nodeName.toLowerCase() === 'li') {
      const hasParent = possibleListParents.find((tag: Element) =>
        tag.contains(parent),
      ) as HTMLElement;
      if (hasParent) {
        parent = hasParent;
      }
    }

    if (['td', 'th', 'tr'].includes(parent.nodeName.toLowerCase())) {
      const hasParent = possibleTableParents.find((tag: Element) =>
        tag.contains(parent),
      ) as HTMLElement;
      if (hasParent) {
        parent = hasParent;
      }
    }

    return parent;
  };

  // Original node filtering without early exits
  const doesNodePassHeuristics = (node: Node) => {
    const text = node.textContent?.trim() ?? '';
    if (text.length < 10) return false;

    const parentNode = node.parentElement;
    if (!parentNode) return false;

    if (barredNodes.has(parentNode)) return false;

    if (
      !parentNode.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      })
    )
      return false;

    const rect = parentNode.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;

    return true;
  };

  // Original node traversal without optimizations
  const getAllReadableNodes = (): NodeWithRect[] => {
    const readableNodes: Node[] = [];
    const treeWalker = document.createTreeWalker(
      documentBody,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return doesNodePassHeuristics(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      },
    );

    while (treeWalker.nextNode()) {
      readableNodes.push(treeWalker.currentNode);
    }

    const uniqueParents = new Set<HTMLElement>();
    for (const node of readableNodes) {
      uniqueParents.add(findHighestDirectParentOfReadableNode(node));
    }

    return Array.from(uniqueParents).map((node) => ({
      node,
      rect: node.getBoundingClientRect(),
    }));
  };

  const distanceFunction = (a: NodeWithRect, b: NodeWithRect) => {
    let dx = 0;
    let dy = 0;
    const rect1 = a.rect;
    const rect2 = b.rect;

    if (rect1.x + rect1.width < rect2.x) {
      dx = rect2.x - (rect1.x + rect1.width);
    } else if (rect2.x + rect2.width < rect1.x) {
      dx = rect1.x - (rect2.x + rect2.width);
    }

    if (rect1.y + rect1.height < rect2.y) {
      dy = rect2.y - (rect1.y + rect1.height);
    } else if (rect2.y + rect2.height < rect1.y) {
      dy = rect1.y - (rect2.y + rect2.height);
    }

    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance;
  };

  // Original clustering with default parameters
  const clusterReadableNodes = (nodes: NodeWithRect[]) => {
    const { clusters } = DBSCAN({
      dataset: nodes,
      epsilon: 28,
      minimumPoints: 2,
      distanceFunction,
    });
    return clusters;
  };

  const totalTextLength = (cluster: number[]) => {
    return cluster
      .map((t) =>
        readableNodes[t].node.innerText?.replaceAll(/ {2}|\r\n|\n|\r/gm, ''),
      )
      .join('').length;
  };

  const approximatelyEqual = (a: number, b: number, epsilon = 1) => {
    return Math.abs(a - b) < epsilon;
  };

  const getClusterBounds = (cluster: number[]) => {
    const leftMostPoint = Math.min(
      ...cluster.map((c) => readableNodes[c].rect.x),
    );
    const topMostPoint = Math.min(
      ...cluster.map((c) => readableNodes[c].rect.y),
    );
    const rightMostPoint = Math.max(
      ...cluster.map(
        (c) => readableNodes[c].rect.x + readableNodes[c].rect.width,
      ),
    );
    const bottomMostPoint = Math.max(
      ...cluster.map(
        (c) => readableNodes[c].rect.y + readableNodes[c].rect.height,
      ),
    );

    return {
      x: leftMostPoint,
      y: topMostPoint,
      width: rightMostPoint - leftMostPoint,
      height: bottomMostPoint - topMostPoint,
    };
  };

  const round = (num: number, decimalPlaces = 2) => {
    const factor = 10 ** decimalPlaces;
    return Math.round(num * factor) / factor;
  };

  const clusterCentrality = (cluster: number[]) => {
    const bounds = getClusterBounds(cluster);
    const centerOfScreen = window.innerWidth / 2;

    if (bounds.x < centerOfScreen && bounds.x + bounds.width > centerOfScreen) {
      return 0;
    }

    if (bounds.x + bounds.width < centerOfScreen) {
      return centerOfScreen - (bounds.x + bounds.width);
    }

    return bounds.x - centerOfScreen;
  };

  const percentageTextShare = (cluster: number[], totalLength: number) => {
    return round((totalTextLength(cluster) / totalLength) * 100);
  };

  const shouldMergeClusters = (clusterA: number[], clusterB: number[]) => {
    const clusterABounds = getClusterBounds(clusterA);
    const clusterBBounds = getClusterBounds(clusterB);

    const isHorizontallyAligned =
      approximatelyEqual(clusterABounds.x, clusterBBounds.x, 40) &&
      approximatelyEqual(clusterABounds.width, clusterBBounds.width, 40);

    if (!isHorizontallyAligned) return false;

    const higherCluster =
      clusterABounds.y < clusterBBounds.y ? clusterABounds : clusterBBounds;
    const lowerCluster =
      clusterABounds.y < clusterBBounds.y ? clusterBBounds : clusterABounds;
    const yGap = lowerCluster.y - (higherCluster.y + higherCluster.height);

    if (approximatelyEqual(yGap, 0, 100)) return true;
  };

  const allowListedAttributes = ['href', 'src', 'alt', 'title', 'class', 'id'];

  function serializeHTMLElement(node: Element): SerializedHTMLElement {
    return {
      tagName: node.tagName.toLowerCase(),
      attributes: allowListedAttributes.reduce(
        (acc, attr) => {
          const value = node.getAttribute(attr);
          if (value) {
            acc[attr] = value;
          }
          return acc;
        },
        {} as Record<string, string>,
      ),
      content: Array.from(node.childNodes)
        .map(serializeNode)
        .filter(
          (node): node is string | SerializedHTMLElement => node !== null,
        ),
    };
  }

  function serializeNode(node: Node): SerializedHTMLElement | string | null {
    if (node.nodeType === 1) return serializeHTMLElement(node as Element);
    if (node.nodeType === 3) return node.textContent ?? '';
    return null;
  }

  function getPageMetadata(): {
    title: string;
    siteName?: string;
    author?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  } {
    const title = document.title ?? '';
    const siteName =
      document
        .querySelector("meta[property='og:site_name']")
        ?.getAttribute('content') ?? undefined;
    const author =
      document.querySelector("meta[name='author']")?.getAttribute('content') ??
      undefined;
    const description =
      document
        .querySelector("meta[name='description']")
        ?.getAttribute('content') ??
      document
        .querySelector("meta[property='og:description']")
        ?.getAttribute('content') ??
      undefined;
    const createdAt =
      document
        .querySelector("meta[property='article:published_time']")
        ?.getAttribute('content') ??
      document.querySelector("meta[name='date']")?.getAttribute('content') ??
      undefined;
    const updatedAt =
      document
        .querySelector("meta[property='article:modified_time']")
        ?.getAttribute('content') ?? undefined;

    return { title, siteName, author, description, createdAt, updatedAt };
  }

  const readableNodes = getAllReadableNodes();
  console.log(`[OLD] Found ${readableNodes.length} readable nodes`);

  const clusters = clusterReadableNodes(readableNodes);
  console.log(`[OLD] DBSCAN found ${clusters.length} clusters`);

  const criticalClusters = findCriticalClusters(clusters);
  console.log(`[OLD] Found ${criticalClusters.length} critical clusters`);

  // Original filtering without Set optimization
  const filteredNodes = readableNodes.filter((_, idx) =>
    criticalClusters.some((cluster) => cluster.includes(idx)),
  );
  console.log(`[OLD] Filtered down to ${filteredNodes.length} nodes`);

  // Original deduplication without Map
  const uniqueNodes = new Set();
  const elements = filteredNodes
    .filter(({ node }) => {
      if (uniqueNodes.has(node)) return false;
      uniqueNodes.add(node);
      return true;
    })
    .map(({ node }) => serializeHTMLElement(node));
  console.log(`[OLD] Final element count: ${elements.length}`);

  const metadata = getPageMetadata();

  return {
    ...metadata,
    elements,
    metrics: {
      clusterCount: clusters.length,
    },
  };
}
