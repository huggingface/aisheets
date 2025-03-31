import { component$, isDev, useVisibleTask$ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { oauthLoginUrl } from '@huggingface/hub';
import { useOAuthClientEnv } from '~/loaders';
import { useClientSession } from '~/state';

export default component$(() => {
  const { isLoggedIn } = useClientSession();
  const oauth = useOAuthClientEnv();
  const nav = useNavigate();

  useVisibleTask$(async () => {
    if (isLoggedIn.value) {
      return nav('/');
    }

    const { clientId, scopes } = oauth.value;

    const url = window.location.origin;
    const redirectOrigin = !isDev ? url.replace('http://', 'https://') : url;
    const redirectUrl = `${redirectOrigin}/auth/callback/`;

    const oauthUrl = await oauthLoginUrl({
      clientId,
      scopes,
      redirectUrl,
    });

    window.location.href = `${oauthUrl}&prompt=consent`;
  });

  return <></>;
});
