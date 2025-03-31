import { component$, useVisibleTask$ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import * as hub from '@huggingface/hub';
import { type ClientSession, useClientSession } from '~/state';

export default component$(() => {
  const { isLoggedIn, save } = useClientSession();
  const nav = useNavigate();

  useVisibleTask$(async () => {
    if (isLoggedIn.value) {
      return nav('/');
    }

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

      save(currentSession);

      return nav('/');
    }
  });

  return <></>;
});
