import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import consola from 'consola';
import { useServerSession } from '~/state';

import { INFERENCE_PROVIDERS } from '@huggingface/inference';

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
  provider: string;
  tags?: string[];
  safetensors?: unknown; // Probably the model weights
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
    ...INFERENCE_PROVIDERS.map((provider) => ['inference_provider', provider]),
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

  return data.flatMap((model) => {
    const providers = model.inferenceProviderMapping;

    return providers
      ? providers
          .filter((provider: any) => provider.status === 'live')
          .map((provider: any) => {
            return {
              ...model,
              provider: provider.provider,
            };
          })
      : [];
  }) as Model[];
});
