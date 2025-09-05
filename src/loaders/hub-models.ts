import {
  type RequestEventLoader,
  routeLoader$,
  server$,
} from '@builder.io/qwik-city';

import type { RequestEventBase } from '@builder.io/qwik-city';

import { INFERENCE_PROVIDERS } from '@huggingface/inference';
import { appConfig } from '~/config';
import { type Session, useServerSession } from '~/state';

// This list helps to exclude providers that are not supported by the endpoint
const UNSUPPORTED_PROVIDERS = ['openai', 'nscale', 'ovhcloud'];

const MODEL_EXPANDABLE_KEYS = [
  'author',
  //'cardData',
  //'config',
  'createdAt',
  //'disabled',
  'downloads',
  //'downloadsAllTime',
  //'gated',
  //'inference',
  'inferenceProviderMapping',
  //'lastModified',
  //'library_name',
  'likes',
  //'mask_token',
  //'model-index',
  //'pipeline_tag',
  'private',
  'safetensors',
  //'sha',
  //'siblings',
  //'spaces',
  'tags',
  //'transformersInfo',
  'trendingScore',
  //'widgetData',
  //'gguf',
  //'resourceGroup',
];

export interface Model {
  id: string;
  providers: string[];
  supportedType: string;
  tags?: string[];
  safetensors?: unknown;
  size?: string;
  pipeline_tag?: string;
  trendingScore?: number;
  picture?: string;
}

const cachedOrgAvatars: Record<string, string> = {};

const fetchAvatar = async (modelId: string): Promise<string | undefined> => {
  const org = modelId.split('/')[0];
  if (cachedOrgAvatars[org] !== undefined) {
    return cachedOrgAvatars[org];
  }

  try {
    const response = await fetch(
      `https://huggingface.co/api/organizations/${org}/avatar`,
    );
    const data = await response.json();

    if (response.ok && data?.avatarUrl) {
      cachedOrgAvatars[org] = data.avatarUrl;
      return data.avatarUrl;
    }
  } catch {
    cachedOrgAvatars[org] = '';
  }

  return undefined;
};

const listAllModels = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Model[]> {
  const session = useServerSession(this);
  if (!session) return [];

  // Fetch models for both pipeline tags
  const models = await Promise.all([
    // All text generation models that support conversational
    Promise.all([
      fetchModelsForPipeline(session, 'text-generation'),
      fetchModelsForPipeline(session, 'image-text-to-text'),
    ]).then((models) =>
      models
        .flat()
        .filter((model) => model.tags?.includes('conversational'))
        .map((model) => ({
          ...model,
          supportedType: 'text',
        })),
    ),
    // All image generation models
    // TODO: Add pagination support since image generation models can be large
    // and we might want to fetch more than just the first 1000 models.
    fetchModelsForPipeline(session, 'text-to-image').then((models) =>
      models.map((model) => ({
        ...model,
        supportedType: 'image',
      })),
    ),
  ]);

  const allModels = models
    .flat()
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));

  return await Promise.all(
    allModels.map(async (m) => ({
      ...m,
      picture: await fetchAvatar(m.id),
    })),
  );
});

const fetchModelsForPipeline = async (
  session: Session,
  kind: 'text-generation' | 'image-text-to-text' | 'text-to-image',
  limit?: number,
): Promise<Model[]> => {
  const url = 'https://huggingface.co/api/models';

  const params = new URLSearchParams([
    ...Object.entries({
      pipeline_tag: kind,
      sort: 'trendingScore',
      direction: '-1',
    }),
    ...INFERENCE_PROVIDERS.filter(
      (m) => !UNSUPPORTED_PROVIDERS.includes(m),
    ).map((provider) => ['inference_provider', provider]),
    ...MODEL_EXPANDABLE_KEYS.map((key) => ['expand', key]),
  ]);

  if (limit) {
    params.append('limit', `${limit}`);
  }

  const {
    authentication: { hfToken },
    inference: { excludedHubModels },
  } = appConfig;

  const token = session.anonymous ? hfToken : session.token;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    console.warn(`Failed to fetch ${kind} models`, response.status, message);
    return [];
  }

  const data: any[] = await response.json();

  const models = data.reduce((acc: Model[], model) => {
    const providers = model.inferenceProviderMapping;

    if (!providers?.length) return acc;

    const availableProviders = providers
      .filter((provider: any) => provider.status === 'live')
      .map((provider: any) => provider.provider);

    if (
      availableProviders.length > 0 &&
      !excludedHubModels.includes(model.id)
    ) {
      let sizeInB = 0;
      if (model.safetensors) {
        const paramCounts = Object.entries(
          model.safetensors.parameters || {},
        ).map(([_, value]) => Number(value));

        sizeInB = Math.max(...paramCounts) / 1e9;
      }

      let size: string | undefined;
      if (Number.isFinite(sizeInB) && sizeInB > 0) {
        size = `${Math.floor(sizeInB)}B`;
      }

      acc.push({
        ...model,
        providers: availableProviders,
        size,
        pipeline_tag: kind,
      });
    }

    return acc;
  }, []) as Model[];

  return models;
};

export const useHubModels = routeLoader$(async function (
  this: RequestEventLoader,
): Promise<Model[]> {
  const models = await listAllModels();

  const {
    inference: {
      tasks: { textGeneration },
    },
  } = appConfig;

  if (models.length === 0) {
    return [
      {
        id: textGeneration.defaultModel,
        providers: [textGeneration.defaultProvider],
        tags: ['conversational'],
        safetensors: {},
        pipeline_tag: 'text-generation',
        supportedType: 'text',
      },
      // TODO: Add default image model if needed
    ];
  }

  return models;
});

interface TrendingModel {
  id: string;
  picture?: string;
}

export const useTrendingHubModels = routeLoader$(async function (
  this: RequestEventLoader,
): Promise<TrendingModel[]> {
  const session = useServerSession(this);
  if (!session) return [];

  const fetchTrending = async (
    kind: 'text-generation' | 'image-text-to-text' | 'text-to-image',
  ) => {
    let retries = 3;
    let limit = 1;
    let trendingModel = null;

    for (; retries > 0; retries--) {
      try {
        const models = await fetchModelsForPipeline(session, kind, limit);

        if (models?.length > 0 && models[0]) {
          trendingModel = models[0];
          break;
        }

        limit++;
      } catch (error) {
        console.warn(`Error fetching trending model for ${kind}`, error);
      }
    }

    if (!trendingModel) {
      console.warn(`Failed to fetch trending model for ${kind}`);
    }

    return trendingModel;
  };

  const models = await Promise.all([
    fetchTrending('text-generation'),
    fetchTrending('image-text-to-text'),
    fetchTrending('text-to-image'),
  ]);

  return await Promise.all(
    models.map(async (m) => ({
      id: m.id,
      picture: await fetchAvatar(m.id),
    })),
  );
});
