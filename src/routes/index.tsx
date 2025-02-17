import { isDev } from '@builder.io/qwik';
import type { RequestEvent } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { getDatasetIDByUser } from '~/services';
import { saveSession } from '~/services/auth/session';

export const onGet = async ({
  cookie,
  sharedMap,
  redirect,
  next,
  url,
}: RequestEvent) => {
  const session = sharedMap.get('session');
  if (session) {
    const datasetId = await getDatasetIDByUser({
      createdBy: session.user.username,
    });

    throw redirect(301, `/dataset/${datasetId}`);
  }

  const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
  const HF_TOKEN = process.env.HF_TOKEN;

  if (CLIENT_ID) {
    const sessionCode = crypto.randomUUID();

    const redirectOrigin = !isDev
      ? url.origin.replace('http://', 'https://')
      : url.origin;

    const authData = {
      state: sessionCode,
      clientId: CLIENT_ID,
      scopes: process.env.OAUTH_SCOPES || 'openid profile inference-api',
      redirectUrl: `${redirectOrigin}/auth/callback/`,
      localStorage: {
        codeVerifier: undefined,
        nonce: undefined,
      },
    };

    const loginUrl = await hub.oauthLoginUrl(authData);

    cookie.set(
      sessionCode,
      {
        codeVerifier: authData.localStorage.codeVerifier!,
        nonce: authData.localStorage.nonce!,
      },
      {
        secure: true,
        httpOnly: !isDev,
        path: '/auth/callback',
      },
    );
    throw redirect(303, loginUrl);
  }

  if (HF_TOKEN) {
    try {
      const userInfo = (await hub.whoAmI({ accessToken: HF_TOKEN })) as any;

      const session = {
        token: HF_TOKEN,
        user: {
          name: userInfo.fullname,
          username: userInfo.name,
          picture: userInfo.avatarUrl,
        },
      };

      saveSession(cookie, session);
      sharedMap.set('session', session);

      return next();
    } catch (e: any) {
      throw Error(`Invalid HF_TOKEN: ${e.message}`);
    }
  }

  throw Error('Missing HF_TOKEN or OAUTH_CLIENT_ID');
};
