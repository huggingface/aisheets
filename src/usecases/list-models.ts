import { type RequestEventBase, server$ } from '@builder.io/qwik-city';
import { useServerSession } from '~/state';

export interface Model {
  id: string;
  tags?: string[];
}

export const listModels = server$(async function (
  this: RequestEventBase<QwikCityPlatform>,
): Promise<Model[]> {
  const session = useServerSession(this);
  const MODEL_URL = `https://huggingface.co/api/models?inference_provider=${session.inferenceProvider}&pipeline_tag=text-generation`;
  const response = await fetch(MODEL_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  return (await response.json()) as Model[];
});
