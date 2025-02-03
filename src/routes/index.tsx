import { component$, isDev } from '@builder.io/qwik';
import {
  type DocumentHead,
  type RequestEvent,
  routeLoader$,
} from '@builder.io/qwik-city';
import { Commands } from '~/features';

import * as hub from '@huggingface/hub';

import { Table } from '~/features/table/table';
import { useLoadDatasets } from '~/state';
import { useServerSession } from '~/state/session';

export { useDatasetsLoader } from '~/state';

export const onGet = async ({
  cookie,
  sharedMap,
  redirect,
  next,
  url,
  headers,
}: RequestEvent) => {
  const session = sharedMap.get('session');
  if (session) {
    return next();
  }

  // See https://huggingface.co/docs/hub/en/spaces-oauth
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
    const userInfo = (await hub.whoAmI({ accessToken: HF_TOKEN })) as any;

    const session = {
      token: HF_TOKEN,
      user: {
        name: userInfo.name,
        picture: userInfo.avatarUrl,
      },
    };

    cookie.delete('session');

    cookie.set('session', session, {
      secure: true,
      httpOnly: !isDev,
      path: '/',
    });

    sharedMap.set('session', session);

    return next();
  }

  throw Error('Missing HF_TOKEN or OAUTH_CLIENT_ID');
};

export const useSession = routeLoader$(useServerSession);

export default component$(() => {
  useLoadDatasets();

  return (
    <div class="min-h-screen bg-gray-50/50">
      <div class="mx-auto max-w-[1200px] px-6 py-4">
        <Commands />
        <Table />
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'easydatagen',
  meta: [
    {
      name: 'description',
      content: 'easydatagen',
    },
  ],
};
