import { component$, isDev, useVisibleTask$ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { oauthLoginUrl } from '@huggingface/hub';
import { useOAuthClientEnv } from '~/loaders';
import { useClientSession } from '~/state';

export default component$(() => {
  const currentSession = useClientSession();
  const oauth = useOAuthClientEnv();
  const nav = useNavigate();

  useVisibleTask$(async () => {
    if (currentSession.value) {
      document.cookie = `session=${JSON.stringify({
        token: currentSession.value.token,
        username: currentSession.value.user.username,
      })}; path=/; SameSite=None; Secure`;

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
