import { $, component$, isDev, useSignal } from '@builder.io/qwik';
import {
  Link,
  type RequestEvent,
  server$,
  useNavigate,
} from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { LuDownload, LuFile, LuPencilLine, LuZap } from '@qwikest/icons/lucide';

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
      scopes: OAUTH_SCOPES || 'openid profile inference-api',
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

  const handleCreateBlankDataset = $(async () => {
    const datasetId = await createDataset();

    nav(`/dataset/${datasetId}`);
  });

  const handleCreateBlankDatasetWithTransition = $(async () => {
    isTransitioning.value = true;

    const [datasetId] = await Promise.all([
      createDataset(),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ]);

    nav(`/dataset/${datasetId}`);
  });

  return (
    <ActiveDatasetProvider>
      <div class="flex flex-col h-full w-fit overflow-hidden">
        <div
          class={`mt-12 w-[800px] transition-opacity duration-200 ${isTransitioning.value ? 'opacity-0' : 'opacity-100'}`}
        >
          <h1 class="text-3xl font-bold w-full mb-8">Choose how to start</h1>

          <div class="flex flex-col gap-0">
            <div class="w-full text-[#676767] border-t border-b group transition-colors cursor-pointer">
              <div class="w-full px-6 py-5 flex flex-row items-center gap-3 font-light group-hover:bg-gray-50/50">
                <span class="text-sm text-foreground">
                  Generate content on various topics.
                </span>
                <span class="text-[#AAB0C0] text-sm font-light">
                  Create tweets, blog posts, or emails
                </span>
              </div>
            </div>

            <div class="w-full text-[#676767] border-b group transition-colors cursor-pointer">
              <div class="w-full px-6 py-5 flex flex-row items-center gap-3 font-light group-hover:bg-gray-50/50">
                <span class="text-sm text-foreground">
                  Generate questions and responses.
                </span>
                <span class="text-[#AAB0C0] text-sm font-light">
                  Produce reasoning, scientific, or creative writing questions.
                </span>
              </div>
            </div>

            <div class="w-full text-[#676767] border-b group transition-colors cursor-pointer">
              <div class="w-full px-6 py-5 flex flex-row items-center gap-3 font-light group-hover:bg-gray-50/50">
                <span class="text-sm text-foreground">
                  Generate code problems and solutions.
                </span>
                <span class="text-[#AAB0C0] text-sm font-light">
                  Design coding challenges with solutions.
                </span>
              </div>
            </div>

            <div
              class="w-full text-[#676767] border-b group transition-colors cursor-pointer"
              onClick$={handleCreateBlankDataset}
            >
              <div class="w-full px-6 py-5 flex flex-row items-center gap-3 font-light group-hover:bg-gray-50/50">
                <LuFile class="w-4 h-4 text-foreground" />
                <span class="text-sm text-foreground">
                  Create a blank dataset.
                </span>
                <span class="text-[#AAB0C0] text-sm font-light">
                  Build your synthetic data from scratch
                </span>
              </div>
            </div>

            <Link href="/dataset/create/from-hub" class="w-full">
              <div class="w-full text-[#676767] border-b group transition-colors cursor-pointer">
                <div class="w-full px-6 py-5 flex flex-row items-center gap-3 font-light group-hover:bg-gray-50/50">
                  <LuDownload class="w-4 h-4 text-foreground" />
                  <span class="text-sm text-foreground">
                    Import a dataset from Hugging Face.
                  </span>
                  <span class="text-[#AAB0C0] text-sm font-light">
                    Ideal for model benchmarking
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div
          class={`mt-16 text-primary-foreground font-light bg-white w-fit transition-all duration-1000 ${isTransitioning.value ? '-translate-y-[400px]' : ''}`}
        >
          <table class="border-separate border-spacing-0 text-sm">
            <thead>
              <tr class="min-h-8 h-8">
                <th class="min-w-80 w-80 max-w-80 px-2 text-left border-[0.5px] border-r-0 border-b-0 rounded-tl-sm bg-neutral-100">
                  <div class="flex items-center justify-between gap-2 w-full">
                    <div class="flex items-center gap-2 text-wrap w-[80%] font-normal">
                      <LuZap class="text-primary-foreground" />
                      Column 1
                    </div>
                  </div>
                </th>

                <th class="min-w-80 w-80 max-w-80 px-2 text-left border-[0.5px] border-r-0 border-b-0 border-t-0 bg-neutral-100 relative">
                  <div
                    class={`absolute -top-6 left-[15%] -translate-x-1/2 bg-white shadow-md !rounded-none flex min-w-[240px] border border-[#eee] transition-opacity duration-200 h-[44px] cursor-pointer group ${isTransitioning.value ? 'opacity-0' : 'opacity-100'}`}
                    onClick$={handleCreateBlankDatasetWithTransition}
                  >
                    <div class="flex items-center gap-2 px-4 w-full group-hover:bg-gray-50/50 transition-colors">
                      <LuPencilLine class="w-4 h-4 text-[#676767]" />
                      <span class="text-[#999] text-sm font-light">
                        Start with a prompt
                      </span>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} class="hover:bg-gray-50/50 transition-colors">
                  <td class="min-w-80 w-80 max-w-80 p-4 min-h-[100px] h-[100px] border-[0.5px] border-b-0 border-r-0 border-neutral-300" />
                  <td class="min-w-80 w-80 max-w-80 p-4 min-h-[100px] h-[100px] border-[0.5px] border-b-0 border-r-0 border-neutral-300" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});
