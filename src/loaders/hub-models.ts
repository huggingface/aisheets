import type { RequestEventBase } from '@builder.io/qwik-city';
import {
  type RequestEventLoader,
  routeLoader$,
  server$,
} from '@builder.io/qwik-city';

import { INFERENCE_PROVIDERS } from '@huggingface/inference';
import { appConfig } from '~/config';
import { cacheGet, cacheSet } from '~/services/cache';
import { type Session, type TaskType, useServerSession } from '~/state';

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
  supportedType: string;
  providers?: string[];
  endpointUrl?: string;
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

const listTextGenerationModels = async (session: Session): Promise<Model[]> => {
  const textModels = await Promise.all([
    fetchModelsForPipeline(session, 'text-generation'),
    fetchModelsForPipeline(session, 'image-text-to-text'),
  ]);

  return textModels
    .flat()
    .map((model) => ({
      ...model,
      supportedType: 'text',
    }))
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
};

const listImageGenerationModels = async (
  session: Session,
): Promise<Model[]> => {
  const imageModels = await fetchModelsForPipeline(session, 'text-to-image');

  return imageModels
    .map((model) => ({
      ...model,
      supportedType: 'image',
    }))
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
};

const listAllModels = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Model[]> {
  const session = useServerSession(this);
  if (!session) return [];

  // Fetch models for all supported generation types
  const models = await Promise.all([
    // All text generation models that support conversational
    listTextGenerationModels(session),
    // All image-text-to-text models
    fetchModelsForPipeline(session, 'image-text-to-text').then((models) =>
      models.map((model) => ({
        ...model,
        supportedType: 'image-text-to-text',
      })),
    ),
    // All image generation models
    // TODO: Add pagination support since image generation models can be large
    // and we might want to fetch more than just the first 1000 models.
    listImageGenerationModels(session),
  ]);

  return await Promise.all(
    models.flat().map(async (m) => ({
      ...m,
      picture: await fetchAvatar(m.id),
    })),
  );
});

const fetchModelsForPipeline = async (
  session: Session,
  kind: TaskType,
  limit?: number,
): Promise<Model[]> => {
  const cachedValue = cacheGet({ kind, limit });
  if (cachedValue) return cachedValue as Model[];

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

  try {
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

    cacheSet({ kind, limit }, models);

    return models;
  } catch (error) {
    console.warn(`Unexpected error getting models`, String(error));
    return [];
  }
};

export const useHubModels = routeLoader$(async function (
  this: RequestEventLoader,
): Promise<Model[]> {
  const { customModels = [] } = appConfig.inference.tasks.textGeneration;
  // Remove this constant when we want tu support custom models and HF models at the same time
  const hideHFModels = customModels.length > 0;

  if (hideHFModels) {
    const [imageModels, imageTextToTextModels] = await Promise.all([
      listImageGenerationModels(useServerSession(this)!),
      fetchModelsForPipeline(
        useServerSession(this)!,
        'image-text-to-text',
      ).then((models) =>
        models.map((model) => ({
          ...model,
          supportedType: 'image-text-to-text',
        })),
      ),
    ]);

    return [...customModels, ...imageModels, ...imageTextToTextModels];
  }

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

  const models = await Promise.all([
    fetchModelsForPipeline(session, 'text-generation', 1),
    fetchModelsForPipeline(session, 'text-to-image', 1),
    fetchModelsForPipeline(session, 'image-text-to-text', 1),
  ]);

  return await Promise.all(
    models
      .flat()
      .filter((m) => !!m)
      .map(async (m) => ({
        id: m.id,
        picture: await fetchAvatar(m.id),
      })),
  );
});
