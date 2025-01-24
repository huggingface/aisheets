import { component$ } from '@builder.io/qwik';
import type { DocumentHead, RequestEvent } from '@builder.io/qwik-city';
import { AddColumn, Commands } from '~/features';

import { Table } from '~/components';
import { useHome } from '~/routes/useHome';

import * as hub from '@huggingface/hub';
import { useSession } from '~/state/session';

export { useColumnsLoader, useSession } from '~/state';

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;

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

  const sessionCode = crypto.randomUUID();

  const authData = {
    state: sessionCode,
    clientId: CLIENT_ID,
    redirectUrl: `${url.origin}/auth/callback/`,
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
      httpOnly: true,
      path: '/auth/callback',
    },
  );

  throw redirect(303, loginUrl);
};

export default component$(() => {
  const session = useSession();
  const { columns, onCreateColumn } = useHome();

  return (
    <div class="mx-auto px-4 pt-2">
      <h2>Hello {session.value.user.name} 👋</h2>
      <Commands />

      <Table columns={columns} />

      <AddColumn onCreateColumn={onCreateColumn} />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Argilla - V3',
  meta: [
    {
      name: 'description',
      content: 'Argilla - V3',
    },
  ],
};
