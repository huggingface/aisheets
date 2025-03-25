import { component$, isDev, isServer, useVisibleTask$ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { oauthHandleRedirectIfPresent, oauthLoginUrl } from '@huggingface/hub';
import { useClientOAuth } from '~/loaders';
import type { ClientSession } from '~/state';

export default component$(() => {
  const oauth = useClientOAuth();
  const nav = useNavigate();

  useVisibleTask$(async () => {
    if (isServer) return;

    const oauthResult = await oauthHandleRedirectIfPresent();

    if (oauthResult) {
      const clientSession: ClientSession = {
        expires: new Date(oauthResult.accessTokenExpiresAt),
        token: oauthResult.accessToken,
        user: {
          name: oauthResult.userInfo.name,
          picture: oauthResult.userInfo.picture,
          username: oauthResult.userInfo.preferred_username,
        },
      };

      localStorage.setItem('oauth', JSON.stringify(clientSession));

      return nav('/');
    }

    const { clientId, scopes } = oauth.value;

    const url = window.location.origin;
    const redirectOrigin = !isDev ? url.replace('http://', 'https://') : url;
    const redirectUrl = `${redirectOrigin}/signin`;

    const oauthUrl = await oauthLoginUrl({
      clientId,
      scopes,
      redirectUrl,
    });

    window.location.href = `${oauthUrl}&prompt=consent`;
  });

  return <></>;
});
