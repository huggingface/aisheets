import { routeLoader$ } from '@builder.io/qwik-city';
import { useServerSession } from '~/state';

export const useSession = routeLoader$(useServerSession);
