import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import consola from 'consola';
import { useServerSession } from '~/state';

import { INFERENCE_PROVIDERS } from '@huggingface/inference';

// This list helps to exclude providers that are not supported by the endpoint
const UNSUPPORTED_PROVIDERS = ['openai'];

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
}

export const useListModels = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Model[]> {
  const session = useServerSession(this);

  const url = 'https://huggingface.co/api/models';

  const params = new URLSearchParams([
    ...Object.entries({
      pipeline_tag: 'text-generation',
      sort: 'trendingScore',
      direction: '-1',
    }),
    ...INFERENCE_PROVIDERS.filter(
      (m) => !UNSUPPORTED_PROVIDERS.includes(m),
    ).map((provider) => ['inference_provider', provider]),
    ...MODEL_EXPANDABLE_KEYS.map((key) => ['expand', key]),
  ]).toString();

  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    consola.warn('Failed to fetch models', response.status, message);

    throw new Error('Failed to fetch models');
  }

  const data: any[] = await response.json();

  return data.reduce((acc: Model[], model) => {
    const providers = model.inferenceProviderMapping;

    if (!providers?.length) return acc;

    const availableProviders = providers
      .filter((provider: any) => provider.status === 'live')
      .map((provider: any) => provider.provider);

    if (availableProviders.length > 0) {
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
      });
    }

    return acc;
  }, []) as Model[];
});
