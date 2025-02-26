import { type PropsOf, Slot, component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { type VariantProps, cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded text-sm font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      look: {
        primary:
          'p-4 rounded-2xl h-10 bg-ring hover:bg-indigo-300 text-white w-fit select-none',
        secondary:
          'p-4 rounded-2xl h-10 w-fit select-none border border-secondary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:shadow-base active:press',
        alert:
          'border-base bg-alert text-alert-foreground shadow-sm hover:bg-alert/90 active:shadow-base active:press',
        outline:
          'border bg-background text-foreground shadow-sm hover:bg-accent active:shadow-base active:press',
        ghost: 'text-accent-foreground hover:bg-accent',
        link: 'text-foreground hover:bg-transparent hover:text-foreground/80 hover:underline hover:underline-offset-2',
      },
      size: {
        sm: 'h-8 px-2 py-1.5 text-sm',
        md: 'h-12 px-4 py-3 text-base',
        lg: ' h-16 px-8 py-4 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      look: 'secondary',
    },
  },
);

type ButtonProps = PropsOf<'button'> &
  VariantProps<typeof buttonVariants> & {
    hover?: boolean;
  };

export const Button = component$<ButtonProps>(
  ({ size, look, hover = true, ...props }) => {
    const buttonHover = cn({
      'hover:bg-transparent': !hover,
    });

    return (
      <button
        {...props}
        class={cn(buttonVariants({ size, look }), props.class, buttonHover)}
      >
        <Slot />
      </button>
    );
  },
);
