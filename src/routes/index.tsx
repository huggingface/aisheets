import { $, component$, isDev, useSignal } from '@builder.io/qwik';
import {
  Link,
  type RequestEvent,
  server$,
  useNavigate,
} from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { LuDownload, LuFile, LuPlus, LuZap } from '@qwikest/icons/lucide';
import { Button } from '~/components';

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
        <div class="mt-36 w-[600px]">
          <Button
            look="ghost"
            hover={false}
            class="w-full text-[#676767] py-4 border-b border-t rounded-none"
            onClick$={handleCreateBlankDataset}
          >
            <div class="w-full px-4 flex flex-row justify-start gap-1">
              <LuFile class="w-5 h-5" />
              Start with a blank dataset.
              <span class="text-[#AAB0C0]">
                Build your synthetic data from scratch
              </span>
            </div>
          </Button>

          <Link href="/dataset/create/from-hub">
            <Button
              look="ghost"
              hover={false}
              class="w-full text-[#676767] py-4 border-b rounded-none"
            >
              <div class="w-full px-4 flex flex-row justify-start gap-1">
                <LuDownload class="w-5 h-5" />
                Import a dataset from Hugging Face.
                <span class="text-[#AAB0C0]">Ideal for model benchmarking</span>
              </div>
            </Button>
          </Link>
        </div>

        <div
          class={`mt-32 text-primary-foreground font-light bg-white w-fit transition-all duration-1000 ${isTransitioning.value ? '-translate-y-72' : ''}`}
        >
          <table class="border-separate border-spacing-0 text-sm">
            <thead>
              <tr class="min-h-8 h-8">
                <th class="min-w-80 w-80 max-w-80 px-2 text-left border-[0.5px] border-r-0 border-b-0 rounded-tl-sm bg-primary">
                  <div class="flex items-center justify-between gap-2 w-full">
                    <div class="flex items-center gap-2 text-wrap w-[80%] font-normal">
                      <LuZap class="text-primary-foreground" />
                      Column 1
                    </div>
                  </div>
                </th>

                <th class="min-w-80 w-80 max-w-80 px-2 text-left border-[0.5px] border-r-0 border-b-0 border-t-0 bg-primary">
                  <Button
                    look="ghost"
                    size="sm"
                    class="bg-[#EBFFD6]"
                    onClick$={handleCreateBlankDatasetWithTransition}
                  >
                    <LuPlus class="text-sm text-primary-foreground" />
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} class="hover:bg-gray-50/50 transition-colors">
                  <td class="min-w-80 w-80 max-w-80 p-4 min-h-[100px] h-[100px] border-[0.5px] border-b-0 border-r-0 border-secondary" />
                  <td class="min-w-80 w-80 max-w-80 p-4 min-h-[100px] h-[100px] border-[0.5px] border-b-0 border-r-0 border-secondary" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ActiveDatasetProvider>
  );
});
