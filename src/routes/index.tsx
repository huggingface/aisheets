import { component$, isDev, useSignal } from '@builder.io/qwik';
import { type RequestEvent, server$, useNavigate } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { LuEgg, LuFilePlus2 } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';

import { CLIENT_ID, HF_TOKEN, OAUTH_SCOPES } from '~/config';
import { createDatasetIdByUser } from '~/services';
import { saveSession } from '~/services/auth/session';
import { ActiveDatasetProvider, useServerSession } from '~/state';

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

  if (CLIENT_ID) {
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
    } catch (e: any) {
      throw Error(`Invalid HF_TOKEN: ${e.message}`);
    }

    throw redirect(303, '/');
  }

  throw Error('Missing HF_TOKEN or OAUTH_CLIENT_ID');
};

const createDataset = server$(async function (this) {
  const session = useServerSession(this);

  return await createDatasetIdByUser({
    createdBy: session.user.username,
  });
});

export default component$(() => {
  const isTransitioning = useSignal(false);
  const nav = useNavigate();

  return (
    <ActiveDatasetProvider>
      <div class="w-full h-full flex flex-col items-center justify-center gap-6">
        <h1 class="text-2xl font-medium">Design your data in a sheet</h1>

        <div class="relative w-[600px] mt-6">
          <div class="w-full h-96 min-h-96 max-h-96 bg-white border border-secondary-foreground rounded-sm">
            <Textarea
              id="prompt"
              look="ghost"
              class="p-4 h-80 min-h-80 max-h-80 resize-none overflow-auto text-base rounded-sm"
            />
          </div>
          <div
            class="w-full absolute bottom-2 right-2 flex flex-row items-center justify-between cursor-text"
            onClick$={() => document.getElementById('prompt')?.focus()}
          >
            <div class="flex w-full justify-end items-center">
              <Button look="primary" disabled>
                <LuEgg class="text-2xl" />
              </Button>
            </div>
          </div>
        </div>
        <div class="w-[550px] flex justify-center items-center">
          <hr class="w-full border-t border-gray-300" />
          <span class="mx-4 text-gray-400">OR</span>
          <hr class="w-full border-t border-gray-300" />
        </div>

        <div class="w-[550px] flex justify-center items-center">
          <Button class="flex gap-1">
            <LuFilePlus2 class="text-lg" />
            Drop or click to start with a file
          </Button>
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});
