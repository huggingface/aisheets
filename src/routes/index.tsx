import { component$, isDev, useSignal } from '@builder.io/qwik';
import { type RequestEvent, server$ } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { LuEgg, LuGlobe } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { Logo } from '~/components/ui/logo/logo';

import { CLIENT_ID, HF_TOKEN, OAUTH_SCOPES } from '~/config';
import { DragAndDrop } from '~/features/import-from-file/drag-n-drop';
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

  const startingPrompts = [
    'Summaries of popular Motown songs by artist, including lyrics',
    'Top list of recent climate-related disaster with a description of the event and location',
  ];

  return (
    <ActiveDatasetProvider>
      <div class="w-full h-full flex flex-col items-center justify-center gap-2">
        <h1 class="text-3xl font-medium text-neutral-700">
          Design your data in a sheet
        </h1>

        <div
          class="relative w-[600px] mt-6"
          onClick$={() => document.getElementById('prompt')?.focus()}
        >
          <div class="w-full h-52 min-h-52 max-h-52 bg-white border border-secondary-foreground rounded-sm pt-2">
            <Textarea
              id="prompt"
              look="ghost"
              placeholder="Create customer claims. Categorize them as formal, humorous, neutral, or injurious, and respond to each in a neutral tone."
              class="px-4 h-32 min-h-32 max-h-32 resize-none overflow-auto text-base rounded-sm text-neutral-500 placeholder:text-neutral-400"
            />
          </div>
          <div
            class="w-full absolute bottom-2 px-4 flex flex-row items-center justify-between cursor-text"
            onClick$={() => document.getElementById('prompt')?.focus()}
          >
            <div class="flex w-full justify-between items-center">
              <Button
                look="secondary"
                class="flex gap-1 p-2 h-9 text-neutral-700"
              >
                <LuGlobe class="text-lg" />
                Search the web
              </Button>

              <Button look="primary" disabled>
                <LuEgg class="text-2xl" />
              </Button>
            </div>
          </div>
        </div>
        <div class="w-[600px] flex flex-col justify-between items-start gap-1">
          {startingPrompts.map((prompt) => (
            <Button
              key={prompt}
              look="secondary"
              class="flex gap-1 text-xs px-2 rounded-xl"
            >
              <Logo class="w-5" />
              {prompt}
            </Button>
          ))}
        </div>
        <div class="w-[550px] flex justify-center items-center">
          <hr class="w-full border-t border-gray-300" />
          <span class="mx-10 text-gray-400">OR</span>
          <hr class="w-full border-t border-gray-300" />
        </div>

        <div class="w-[530px] h-[230px]">
          <DragAndDrop />
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});
