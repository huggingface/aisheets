import { isDev } from '@builder.io/qwik';
import type { Cookie, RequestEvent } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { CLIENT_ID, HF_TOKEN, OAUTH_SCOPES } from '~/config';
import { saveSession } from '~/services/auth/session';
import type { Session } from '~/state/session';

export const onGet = async (event: RequestEvent) => {
  const { sharedMap, redirect, url } = event;


  if (sharedMap.get('session')) throw redirect(303, '/home');

  if (CLIENT_ID) return handleOAuthLogin(event);

  if (HF_TOKEN) return handleHFTokenLogin(event);

  throw Error('Missing HF_TOKEN or OAUTH_CLIENT_ID');
};

const handleOAuthLogin = async ({
  url,
  cookie,
  redirect,
}: { url: URL; cookie: Cookie; redirect: any }) => {
  const sessionCode = crypto.randomUUID();

  const redirectOrigin = !isDev
    ? url.origin.replace('http://', 'https://')
    : url.origin;

  const authData = {
    state: sessionCode,
    clientId: CLIENT_ID,
    scopes: OAUTH_SCOPES,
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
      sameSite: 'none',
      secure: true,
      httpOnly: !isDev,
      path: '/auth/callback',
    },
  );
  throw redirect(303, loginUrl);
};

const handleHFTokenLogin = async ({
  url,
  cookie,
  redirect,
  sharedMap,
}: { url: URL; cookie: Cookie; redirect: any; sharedMap: any }) => {
  try {
    const userInfo = (await hub.whoAmI({ accessToken: HF_TOKEN! })) as any;

    const session: Session = {
      token: HF_TOKEN!,
      user: {
        name: userInfo.fullname,
        username: userInfo.name,
        picture: userInfo.avatarUrl,
      },
    };

    saveSession(cookie, session);
    sharedMap.set('session', session);
  } catch (e: any) {
    throw Error(`Invalid HF_TOKEN: ${e.message}`);
  }

  throw redirect(303, '/');
};
