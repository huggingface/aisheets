import { component$, isDev } from '@builder.io/qwik';
import {
  type DocumentHead,
  type RequestEvent,
  routeLoader$,
} from '@builder.io/qwik-city';
import { Execution } from '~/features';

import * as hub from '@huggingface/hub';

import { DatasetName } from '~/features/datasets/dataset-name';
import { Table } from '~/features/table/table';
import { saveSession } from '~/services/auth/session';
import { useDatasetsStore, useLoadDatasets } from '~/state';
import { useServerSession } from '~/state/session';

export { useDatasetsLoader } from '~/state';

export const onGet = async ({
  cookie,
  sharedMap,
  redirect,
  next,
  url,
}: RequestEvent) => {
  const session = sharedMap.get('session');
  if (session) {
    return next();
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

export const useSession = routeLoader$(useServerSession);

export default component$(() => {
  useLoadDatasets();
  const session = useSession();
  const { activeDataset } = useDatasetsStore();

  return (
    <div class="min-w-screen px-6">
      <div class="flex justify-end items-center w-full mt-6">
        <span>{session.value.user.username}</span>
      </div>
      <div class="flex justify-between items-center w-full mb-4 pt-4">
        <DatasetName dataset={activeDataset.value} />
        <Execution />
      </div>
      <Table />
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
