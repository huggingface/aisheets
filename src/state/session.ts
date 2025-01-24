import { routeLoader$ } from '@builder.io/qwik-city';

interface Session {
  token: string;
  user: {
    name: string;
    email: string;
    picture: string;
  };
}

export const useSession = routeLoader$(({ sharedMap }): Session => {
  const session = sharedMap.get('session')!;

  return {
    token: session.accessToken,
    user: {
      name: session.userInfo.name,
      email: session.userInfo.email,
      picture: session.userInfo.picture,
    },
  };
});
