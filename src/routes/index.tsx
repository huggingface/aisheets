import { $, component$, isDev, useSignal, useStore } from '@builder.io/qwik';
import { type RequestEvent, server$, useNavigate } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { cn } from '@qwik-ui/utils';
import { LuEgg, LuGlobe } from '@qwikest/icons/lucide';
import { Button, Textarea } from '~/components';
import { SecondLogo } from '~/components/ui/logo/logo';

import { CLIENT_ID, HF_TOKEN, OAUTH_SCOPES } from '~/config';
import { DragAndDrop } from '~/features/import-from-file/drag-n-drop';
import { MainSidebarButton } from '~/features/main-sidebar';

import { saveSession } from '~/services/auth/session';
import { ActiveDatasetProvider } from '~/state';
import { runAutoDataset } from '~/usecases/run-autodataset';

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

// Server action to run the autodataset action
const runAutoDatasetAction = server$(async function (
  instruction: string,
  searchEnabled: boolean,
) {
  return await runAutoDataset.call(this, {
    instruction,
    searchEnabled,
    maxSearchQueries: 1,
  });
});

export default component$(() => {
  const nav = useNavigate();
  const searchOnWeb = useSignal(false);
  const prompt = useSignal('');
  const startingPrompts = [
    'Summaries of popular Motown songs by artist, including lyrics',
    'Top list of recent climate-related disaster with a description of the event and location',
  ];

  const isLoading = useSignal(false);
  const response = useStore<{
    text?: string;
    error?: string;
  }>({});

  const handleAssistant = $(async () => {
    if (!prompt.value.trim()) {
      console.warn('Prompt is empty');
      return;
    }

    isLoading.value = true;
    response.text = undefined;
    response.error = undefined;

    try {
      const result = await runAutoDatasetAction(
        prompt.value,
        searchOnWeb.value,
      );

      if (typeof result === 'string') {
        response.text = result;
      } else if ('dataset' in result && result.dataset) {
        // Navigate to the dataset page
        await nav(`/dataset/${result.dataset}/`);
        return;
      }
    } catch (error) {
      console.error('Error running assistant:', error);
      response.error = error instanceof Error ? error.message : String(error);
    } finally {
      isLoading.value = false;
    }
  });

  return (
    <ActiveDatasetProvider>
      <MainSidebarButton />
      <div class="w-full h-full flex flex-col items-center justify-center">
        <div class="flex flex-col items-center justify-center space-y-14">
          <div class="flex flex-col items-center justify-center space-y-4">
            <h1 class="text-2xl font-semibold">Design your data in a sheet</h1>
            <h2 class="text-neutral-500 font-medium">From a simple idea</h2>
          </div>

          <div class="flex flex-col items-center justify-center space-y-3">
            <div
              class="relative w-[700px]"
              onClick$={() => document.getElementById('prompt')?.focus()}
            >
              <div class="w-full bg-white border border-secondary-foreground rounded-xl pb-14 shadow-[0px_4px_6px_rgba(0,0,0,0.1)]">
                <Textarea
                  id="prompt"
                  look="ghost"
                  value={prompt.value}
                  placeholder="Create customer claims. Categorize them as formal, humorous, neutral, or injurious, and respond to each in a neutral tone."
                  class="p-4 max-h-40 resize-none overflow-auto text-base placeholder:text-neutral-400"
                  onInput$={(e, el) => {
                    prompt.value = el.value;

                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
              </div>
              <div
                class="w-full absolute bottom-0 p-4 flex flex-row items-center justify-between cursor-text"
                onClick$={() => document.getElementById('prompt')?.focus()}
              >
                <div class="flex w-full justify-between items-center h-[30px]">
                  <Button
                    look="secondary"
                    class={cn(
                      'flex px-[10px] py-[8px] gap-[10px] bg-white hover:bg-neutral-100 h-[30px] rounded-[8px]',
                      {
                        'border-primary-100 outline-primary-100 bg-primary-50':
                          searchOnWeb.value,
                      },
                    )}
                    onClick$={() => {
                      searchOnWeb.value = !searchOnWeb.value;
                    }}
                  >
                    <LuGlobe class="text-lg" />
                    Search the web
                  </Button>

                  <Button
                    look="primary"
                    onClick$={handleAssistant}
                    disabled={isLoading.value || !prompt.value.trim()}
                  >
                    <LuEgg class="text-2xl" />
                  </Button>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-center justify-center space-y-8">
              <div class="w-[700px] flex flex-col justify-between items-start gap-2">
                {startingPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    look="secondary"
                    class="flex gap-2 text-xs px-2 rounded-xl bg-transparent hover:bg-neutral-100"
                  >
                    <SecondLogo class="w-4" />
                    {prompt}
                  </Button>
                ))}
              </div>

              <div class="w-[697px] flex justify-center items-center">
                <hr class="w-full border-t" />
                <span class="mx-10 text-neutral-500">OR</span>
                <hr class="w-full border-t" />
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
