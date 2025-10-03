import { routeLoader$ } from '@builder.io/qwik-city';
import { useServerSession } from '~/state/session';

export const useSession = routeLoader$(useServerSession);
