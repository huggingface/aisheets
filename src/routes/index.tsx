import type { RequestEvent } from '@builder.io/qwik-city';

export const onGet = async (event: RequestEvent) => {
  const { redirect } = event;

  throw redirect(303, '/home');
};
