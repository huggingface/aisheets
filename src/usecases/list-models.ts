import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import consola from 'consola';
import { INFERENCE_PROVIDER } from '~/config';
import { useServerSession } from '~/state';

export interface Model {
  id: string;
  provider: string;
  tags?: string[];
}

export const useListModels = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Model[]> {
  const session = useServerSession(this);
  const MODEL_URL = `https://huggingface.co/api/models?inference_provider=${INFERENCE_PROVIDER}&pipeline_tag=text-generation&sort=trendingScore&direction=-1`;
  const response = await fetch(MODEL_URL, {
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

  return (await response.json()).map((m: Omit<Model, 'provider'>) => ({
    ...m,
    provider: INFERENCE_PROVIDER,
  })) as Model[];
});
