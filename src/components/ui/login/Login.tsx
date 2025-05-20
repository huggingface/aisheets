import { component$ } from '@builder.io/qwik';
import { useNavigate } from '@builder.io/qwik-city';
import { Button, buttonVariants } from '~/components/ui/button/button';

export const Login = component$(() => {
  const nav = useNavigate();

  return (
    <Button
      class={buttonVariants({
        class: 'bg-primary-600 hover:bg-primary-500 h-[28px]',
        look: 'primary',
      })}
      onClick$={() => {
        nav('/auth');
      }}
    >
      Log In
    </Button>
  );
});
