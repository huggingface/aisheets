import type { RequestEvent } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { saveSession } from '~/services/auth/session';

export const onGet = async (event: RequestEvent) => {
  const { cookie, redirect, query, url } = event;

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
  const { codeVerifier, nonce } = data.json<any>();

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

    const session = {
      anonymous: false,
      token: auth.accessToken,
      user: {
        name: auth.userInfo.name,
        username: auth.userInfo.preferred_username,
        picture: auth.userInfo.picture,
      },
    };

    saveSession(event, session);
  } catch (e) {
    console.error(e);
  }

  throw redirect(308, '/');
};
