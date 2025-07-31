import type { RequestEvent, RequestHandler } from '@builder.io/qwik-city';
import { datasetAsJson } from './utils';

export const onGet: RequestHandler = async (event: RequestEvent) => {
  await datasetAsJson(event);
};
