import {
  type RequestEventLoader,
  routeLoader$,
  server$,
} from '@builder.io/qwik-city';

import type { RequestEventBase } from '@builder.io/qwik-city';

import { INFERENCE_PROVIDERS } from '@huggingface/inference';
import {
  DEFAULT_MODEL,
  DEFAULT_MODEL_PROVIDER,
  EXCLUDED_MODELS,
  HF_TOKEN,
} from '~/config';
import { type Session, useServerSession } from '~/state';

// This list helps to exclude providers that are not supported by the endpoint
const UNSUPPORTED_PROVIDERS = [
  'openai',
  'featherless-ai',
  'groq',
  'nscale',
  'ovhcloud',
];

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
  tags?: string[];
  safetensors?: unknown;
  size?: string;
  pipeline_tag?: string;
  trendingScore?: number;
}

const listModels = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Model[]> {
  const session = useServerSession(this);

  // Fetch models for both pipeline tags
  const models = await Promise.all([
    fetchModelsForPipeline('text-generation', session),
    fetchModelsForPipeline('image-text-to-text', session),
  ]);

  return models
    .flat()
    .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
});

// Function to fetch models for a specific pipeline tag
const fetchModelsForPipeline = async (
  pipelineTag: string,
  session: Session,
): Promise<Model[]> => {
  const url = 'https://huggingface.co/api/models';

  const params = new URLSearchParams([
    ...Object.entries({
      pipeline_tag: pipelineTag,
      sort: 'trendingScore',
      direction: '-1',
    }),
    ...INFERENCE_PROVIDERS.filter(
      (m) => !UNSUPPORTED_PROVIDERS.includes(m),
    ).map((provider) => ['inference_provider', provider]),
    ...MODEL_EXPANDABLE_KEYS.map((key) => ['expand', key]),
  ]).toString();

  const token = session.anonymous ? HF_TOKEN : session.token;
  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    console.warn(
      `Failed to fetch ${pipelineTag} models`,
      response.status,
      message,
    );
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
      !EXCLUDED_MODELS.includes(model.id) &&
      model.tags?.includes('conversational')
    ) {
      let sizeInB = 0;
      if (model.safetensors) {
        const paramCounts = Object.entries(
          model.safetensors.parameters || {},
        ).map(([_, value]) => Number(value));

        sizeInB = Math.max(...paramCounts) / 1e9;
      }

      let size: string | undefined;
      if (Number.isFinite(sizeInB)) {
        size = `${Math.floor(sizeInB)}B`;
      }

      acc.push({
        ...model,
        providers: availableProviders,
        size,
        pipeline_tag: pipelineTag,
      });
    }

    return acc;
  }, []) as Model[];

  return models;
};

export const useHubModels = routeLoader$(async function (
  this: RequestEventLoader,
): Promise<Model[]> {
  const models = await listModels();

  if (models.length === 0) {
    return [
      {
        id: DEFAULT_MODEL,
        providers: [DEFAULT_MODEL_PROVIDER],
        tags: ['conversational'],
        safetensors: {},
        pipeline_tag: 'text-generation',
      },
    ];
  }

  return models;
});
