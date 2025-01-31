import { component$, isDev } from '@builder.io/qwik';
import {
  type DocumentHead,
  type RequestEvent,
  routeLoader$,
} from '@builder.io/qwik-city';
import { AddColumnModal, Commands } from '~/features';

import { Table } from '~/components';

import * as hub from '@huggingface/hub';

import { useServerSession } from '~/state/session';

import { useDatasetsStore, useLoadDatasets } from '~/state';

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

  const session = useSession();
  const { activeDataset } = useDatasetsStore();

  return (
    <div class="mx-auto px-4 pt-2">
      <h2>Hello {session.value.user.name} 👋</h2>
      <h3>
        You are creating the dataset <strong>{activeDataset.value.name}</strong>
      </h3>
      <Commands />

      <Table />

      <AddColumnModal />
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
