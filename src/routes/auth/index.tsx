import { isDev } from '@builder.io/qwik';
import type { RequestEvent } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { CLIENT_ID, HF_TOKEN, OAUTH_HTTPS_ONLY, OAUTH_SCOPES } from '~/config';
import { saveSession } from '~/services/auth/session';
import type { Session } from '~/state/session';

export const onGet = async (event: RequestEvent) => {
  if (CLIENT_ID) return handleOAuthLogin(event);

  if (HF_TOKEN) return handleHFTokenLogin(event);

  throw Error('Missing HF_TOKEN or OAUTH_CLIENT_ID');
};

const handleOAuthLogin = async ({ url, cookie, redirect }: RequestEvent) => {
  const sessionCode = crypto.randomUUID();

  const redirectOrigin = OAUTH_HTTPS_ONLY
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

const handleHFTokenLogin = async (event: RequestEvent) => {
  const { redirect } = event;

  try {
    const userInfo = (await hub.whoAmI({ accessToken: HF_TOKEN! })) as any;

    const session: Session = {
      anonymous: false,
      token: HF_TOKEN!,
      user: {
        name: userInfo.fullname,
        username: userInfo.name,
        picture: userInfo.avatarUrl,
      },
    };

    saveSession(event, session);
  } catch (e: any) {
    throw Error(`Invalid HF_TOKEN: ${e.message}`);
  }

  throw redirect(303, '/');
};
