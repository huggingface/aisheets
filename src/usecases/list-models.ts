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
  console.log('[ListModels] Session:', {
    provider: session.inferenceProvider,
    token: session.token?.slice(0, 10) + '...',
  });

  const MODEL_URL = `https://huggingface.co/api/models?inference_provider=${session.inferenceProvider}&pipeline_tag=text-generation`;

  console.log('[ListModels] Fetching URL:', MODEL_URL);

  const response = await fetch(MODEL_URL);
  console.log('[ListModels] Response status:', response.status);

  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }

  const data = (await response.json()) as Model[];
  console.log('[ListModels] Found models:', data.length);

  return data;
});
