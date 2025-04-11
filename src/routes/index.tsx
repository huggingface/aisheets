import { $, component$, isDev, useSignal } from '@builder.io/qwik';
import { type RequestEvent, server$, useNavigate } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { cn } from '@qwik-ui/utils';
import { LuEgg, LuGlobe } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { SecondLogo } from '~/components/ui/logo/logo';

import { CLIENT_ID, HF_TOKEN, OAUTH_SCOPES } from '~/config';
import { DragAndDrop } from '~/features/import-from-file/drag-n-drop';
import { MainSidebarButton } from '~/features/main-sidebar';
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

export default component$(() => {
  const nav = useNavigate();
  const createDataset = $(async () => {
    const dataset = await server$(async function (this) {
      const session = useServerSession(this);

      return await createDatasetIdByUser({
        createdBy: session.user.username,
      });
    })();

    nav(`/dataset/${dataset}`);
  });

  const startingPrompts = [
    'Summaries of popular Motown songs by artist, including lyrics',
    'Top list of recent climate-related disaster with a description of the event and location',
  ];
  const searchOnWeb = useSignal(false);

  return (
    <ActiveDatasetProvider>
      <MainSidebarButton />
      <div class="w-full h-full flex flex-col items-center justify-center">
        <div class="flex flex-col items-center justify-center space-y-14">
          <div class="flex flex-col items-center justify-center space-y-4">
            <h1 class="text-2xl font-semibold text-neutral-700">
              Design your data in a sheet
            </h1>
            <h2 class="text-neutral-500 font-medium">From a simple idea</h2>
          </div>

          <div class="flex flex-col items-center justify-center space-y-3">
            <div
              class="relative w-[583px]"
              onClick$={() => document.getElementById('prompt')?.focus()}
            >
              <div class="w-full h-48 min-h-48 max-h-48 bg-white border border-secondary-foreground rounded-lg pt-2 shadow-[0px_4px_6px_rgba(0,0,0,0.1)]">
                <Textarea
                  id="prompt"
                  look="ghost"
                  placeholder="Create customer claims. Categorize them as formal, humorous, neutral, or injurious, and respond to each in a neutral tone."
                  class="px-4 h-32 min-h-32 max-h-32 resize-none overflow-auto text-base rounded-sm text-neutral-700 placeholder:text-neutral-400"
                />
              </div>
              <div
                class="w-full absolute bottom-2 px-4 flex flex-row items-center justify-between cursor-text"
                onClick$={() => document.getElementById('prompt')?.focus()}
              >
                <div class="flex w-full justify-between items-center">
                  <Button
                    look="secondary"
                    class={cn(
                      'flex gap-1 py-2 px-2.5 h-9 text-neutral-700 bg-white hover:bg-primary-50/80 rounded-lg',
                      {
                        'outline-primary-100 bg-primary-50': searchOnWeb.value,
                      },
                    )}
                    onClick$={() => (searchOnWeb.value = !searchOnWeb.value)}
                  >
                    <LuGlobe class="text-lg" />
                    Search the web
                  </Button>

                  <Button look="primary" onClick$={createDataset}>
                    <LuEgg class="text-2xl" />
                  </Button>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-center justify-center space-y-8">
              <div class="w-[583px] flex flex-col justify-between items-start gap-2">
                {startingPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    look="secondary"
                    class="flex gap-2 text-xs px-2 rounded-lg outline-neutral-300 bg-neutral-100"
                  >
                    <SecondLogo class="w-4" />
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
          </div>
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});
