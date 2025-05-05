import { component$ } from '@builder.io/qwik';
import { useSession } from '~/loaders';

export const Username = component$(() => {
  const session = useSession();

  return (
    <div class="bg-neutral-600 text-white rounded-full w-8 h-8 flex items-center justify-center">
      {session.value.user.username.slice(0, 2).toUpperCase()}
    </div>
  );
});
