import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { useServerSession } from '~/state';

export interface Model {
  id: string;
  provider: string;
  tags?: string[];
}

export const listModels = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Model[]> {
  const INFERENCE_PROVIDER = process.env.INFERENCE_PROVIDER || 'hf-inference';

  const session = useServerSession(this);
  const MODEL_URL = `https://huggingface.co/api/models?inference_provider=${INFERENCE_PROVIDER}&pipeline_tag=text-generation&sort=trendingScore&direction=-1`;
  const response = await fetch(MODEL_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  return (await response.json()).map((m: Omit<Model, 'provider'>) => ({
    ...m,
    provider: INFERENCE_PROVIDER,
  })) as Model[];
});
