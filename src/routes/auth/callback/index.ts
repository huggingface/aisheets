import type { RequestEvent } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';

export const onGet = async ({
  cookie,
  redirect,
  query,
  url,
  text,
  sharedMap,
  next,
}: RequestEvent) => {
  const code = query.get('code');
  const stateParam = query.get('state');

  if (!code || !stateParam) {
    throw redirect(303, '/');
  }

  const { state: sessionCode, nonce: nonceFromCallback } =
    JSON.parse(stateParam);

  if (!cookie.has(sessionCode)) {
    throw redirect(303, '/');
  }

  const data = cookie.get(sessionCode)!;
  const { codeVerifier, nonce } = data.json() as any;

  if (nonce !== nonceFromCallback) {
    throw redirect(303, '/');
  }

  try {
    cookie.delete(sessionCode);

    const auth = await hub.oauthHandleRedirect({
      codeVerifier,
      nonce,
      redirectedUrl: url.href,
    });

    cookie.delete('session');

    cookie.set('session', auth, {
      secure: true,
      httpOnly: true,
      path: '/',
    });
  } catch (e) {
    console.error(e);
  }

  throw redirect(308, '/');
};
