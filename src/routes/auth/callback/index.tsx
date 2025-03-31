import { component$, useVisibleTask$ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import type { ClientSession } from '~/state';

export default component$(() => {
  const nav = useNavigate();

  useVisibleTask$(async () => {
    const oauthResult = await hub.oauthHandleRedirectIfPresent();

    if (oauthResult) {
      const currentSession: ClientSession = {
        expires: new Date(oauthResult.accessTokenExpiresAt),
        token: oauthResult.accessToken,
        user: {
          name: oauthResult.userInfo.name,
          picture: oauthResult.userInfo.picture,
          username: oauthResult.userInfo.preferred_username,
        },
      };

      localStorage.setItem('oauth', JSON.stringify(currentSession));

      document.cookie = `session=${JSON.stringify({
        token: currentSession.token,
        username: currentSession.user.username,
      })}; path=/; SameSite=None; Secure`;

      nav('/');
    }
  });

  return <></>;
});
