import { component$ } from '@builder.io/qwik';
import { useClientSession } from '~/state';

export const Username = component$(() => {
  const session = useClientSession();

  return (
    <div class="bg-ring text-white rounded-full w-8 h-8 flex items-center justify-center">
      {session.value?.user.username.slice(0, 2).toUpperCase()}
    </div>
  );
});
