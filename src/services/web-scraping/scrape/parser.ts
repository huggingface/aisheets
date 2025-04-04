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
} {
  const DBSCAN = <T>({
    dataset,
    epsilon = 1,
    epsilonCompare = (distance: number, eps: number) => distance < eps,
    minimumPoints = 2,
    distanceFunction,
  }: DBSCANOptions<T>) => {
    const visitedIndices: Record<number, boolean> = {};
    const isVisited = (i: number) => visitedIndices[i];
    const markVisited = (i: number) => {
      visitedIndices[i] = true;
    };

    const clusteredIndices: Record<number, boolean> = {};
    const isClustered = (i: number) => clusteredIndices[i];
    const markClustered = (i: number) => {
      clusteredIndices[i] = true;
    };

    const uniqueMerge = <U>(targetArray: U[], sourceArray: U[]) => {
      for (let i = 0; i < sourceArray.length; i += 1) {
        const item = sourceArray[i];
        if (targetArray.indexOf(item) < 0) {
          targetArray.push(item);
        }
      }
    };

    const findNeighbors = (index: number) => {
      const neighbors = [];
      for (let other = 0; other < dataset.length; other += 1) {
        const distance = distanceFunction(dataset[index], dataset[other]);
        if (epsilonCompare(distance, epsilon)) {
          neighbors.push(other);
        }
      }
      return neighbors;
    };

    const noise: number[] = [];
    const addNoise = (i: number) => noise.push(i);

    const clusters: number[][] = [];
    const createCluster = () => clusters.push([]) - 1;
    const addIndexToCluster = (c: number, i: number) => {
      clusters[c].push(i);
      markClustered(i);
    };

    const expandCluster = (c: number, neighbors: number[]) => {
      for (let i = 0; i < neighbors.length; i += 1) {
        const neighborIndex = neighbors[i];
        if (!isVisited(neighborIndex)) {
          markVisited(neighborIndex);
          const secondaryNeighbors = findNeighbors(neighborIndex);
          if (secondaryNeighbors.length >= minimumPoints) {
            uniqueMerge(neighbors, secondaryNeighbors);
          }
        }
        if (!isClustered(neighborIndex)) {
          addIndexToCluster(c, neighborIndex);
        }
      }
    };

    dataset.forEach((element: T, index: number) => {
      if (!isVisited(index)) {
        markVisited(index);
        const neighbors = findNeighbors(index);
        if (neighbors.length < minimumPoints) {
          addNoise(index);
        } else {
          const clusterIndex = createCluster();
          addIndexToCluster(clusterIndex, index);
          expandCluster(clusterIndex, neighbors);
        }
      }
    });

    return { clusters, noise };
  };

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

  const possibleCodeParents = Array.from(document.querySelectorAll('pre, p'));
  const possibleTableParents = Array.from(document.querySelectorAll('table'));
  const possibleListParents = Array.from(document.querySelectorAll('ul, ol'));

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
      const hasParent = possibleCodeParents.find((tag) =>
        tag.contains(parent),
      ) as HTMLElement;
      if (hasParent) {
        parent = hasParent;
      }
    }

    if (parent.nodeName.toLowerCase() === 'li') {
      const hasParent = possibleListParents.find((tag) =>
        tag.contains(parent),
      ) as HTMLElement;
      if (hasParent) {
        parent = hasParent;
      }
    }

    if (['td', 'th', 'tr'].includes(parent.nodeName.toLowerCase())) {
      const hasParent = possibleTableParents.find((tag) =>
        tag.contains(parent),
      ) as HTMLElement;
      if (hasParent) {
        parent = hasParent;
      }
    }

    return parent;
  };

  const barredNodes = Array.from(
    document.querySelectorAll(IgnoredTagsList.join(',')),
  );

  const doesNodePassHeuristics = (node: Node) => {
    if ((node.textContent ?? '').trim().length < 10) {
      return false;
    }

    const parentNode = findHighestDirectParentOfReadableNode(node);

    if (parentNode && parentNode instanceof Element) {
      if (
        !parentNode.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      )
        return false;

      const rect = parentNode.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) {
        return false;
      }
    }

    if (parentNode && parentNode instanceof Element) {
      if (barredNodes.some((barredNode) => barredNode.contains(parentNode))) {
        return false;
      }
    }

    return true;
  };

  const getAllReadableNodes = (): NodeWithRect[] => {
    if (!document.body) throw new Error('Page failed to load');

    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (doesNodePassHeuristics(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        },
      },
    );

    const readableNodes = [];
    while (treeWalker.nextNode()) {
      readableNodes.push(treeWalker.currentNode as ReadableNode);
    }

    const parentsForReadableNodes = readableNodes.map(
      findHighestDirectParentOfReadableNode,
    );
    const listWithOnlyParents: HTMLElement[] = [];

    for (let i = 0; i < parentsForReadableNodes.length; i++) {
      const node = parentsForReadableNodes[i];
      const hasParentInList = parentsForReadableNodes.find((otherNode, idx) => {
        if (i === idx) return false;
        return otherNode.contains(node);
      });
      listWithOnlyParents.push(hasParentInList ? hasParentInList : node);
    }

    const uniqueParents = Array.from(new Set(listWithOnlyParents));

    return uniqueParents.map((node) => {
      return { node, rect: node.getBoundingClientRect() };
    });
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

  const clusterReadableNodes = (nodes: NodeWithRect[]) => {
    const { clusters } = DBSCAN({
      dataset: nodes,
      epsilon: 28,
      minimumPoints: 1,
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
      clusterABounds.y < clusterBBounds.y ? clusterBBounds : clusterBBounds;
    const yGap = lowerCluster.y - (higherCluster.y + higherCluster.height);

    if (approximatelyEqual(yGap, 0, 100)) return true;
  };

  const findCriticalClusters = (clusters: number[][]) => {
    let i = 0;
    while (i < clusters.length) {
      const cluster = clusters[i];
      for (let j = i + 1; j < clusters.length; j++) {
        const otherCluster = clusters[j];
        if (shouldMergeClusters(cluster, otherCluster)) {
          cluster.push(...otherCluster);
          clusters.splice(j, 1);
          j -= 1;
        }
      }
      i++;
    }

    const totalText = totalTextLength(clusters.flat());

    const clusterWithMetrics = clusters.map((cluster) => {
      const centrality = clusterCentrality(cluster);
      return {
        cluster,
        centrality,
        percentageTextShare: percentageTextShare(cluster, totalText),
      };
    });

    const dominantCluster = clusterWithMetrics[0]?.percentageTextShare > 60;
    if (dominantCluster) return [clusterWithMetrics[0].cluster];

    const sortedClusters = clusterWithMetrics.sort((a, b) => {
      const penaltyForA = 0.9 ** (a.centrality / 100);
      const penaltyForB = 0.9 ** (b.centrality / 100);
      const adjustedTextShareA = a.percentageTextShare * penaltyForA;
      const adjustedTextShareB = b.percentageTextShare * penaltyForB;
      return adjustedTextShareB - adjustedTextShareA;
    });

    const largeTextShareClusters = sortedClusters.filter((c) =>
      approximatelyEqual(
        c.percentageTextShare,
        sortedClusters[0]?.percentageTextShare,
        10,
      ),
    );

    const totalTextShareOfLargeClusters = largeTextShareClusters.reduce(
      (acc, cluster) => acc + cluster.percentageTextShare,
      0,
    );

    if (totalTextShareOfLargeClusters > 60) {
      return largeTextShareClusters.map((c) => c.cluster);
    }

    let totalTextShare = 0;
    const criticalClusters = [];
    for (const cluster of sortedClusters) {
      if (cluster.percentageTextShare < 2) continue;
      if (totalTextShare > 60) break;
      criticalClusters.push(cluster.cluster);
      totalTextShare += cluster.percentageTextShare;
    }

    if (totalTextShare < 60) {
      return [];
    }

    return criticalClusters;
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
  const clusters = clusterReadableNodes(readableNodes);
  const criticalClusters = findCriticalClusters(clusters);

  const filteredNodes = readableNodes.filter((_, idx) => {
    return criticalClusters.some((cluster) => {
      return cluster.includes(idx);
    });
  });

  const elements = filteredNodes
    .filter(
      (node, idx, nodes) =>
        !nodes.slice(idx + 1).some((otherNode) => node.node === otherNode.node),
    )
    .map(({ node }) => serializeHTMLElement(node));

  const metadata = getPageMetadata();

  return {
    ...metadata,
    elements,
  };
}
