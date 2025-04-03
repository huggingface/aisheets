import { component$ } from '@builder.io/qwik';
import { Assistant } from '~/features/assistant/assistant';

export default component$(() => {
  return (
    <div class="pb-0">
      <Assistant />
    </div>
  );
});
