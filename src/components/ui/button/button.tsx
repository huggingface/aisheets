import { type PropsOf, Slot, component$ } from '@builder.io/qwik';
import { cn } from '@qwik-ui/utils';
import { type VariantProps, cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded text-sm font-normal transition-all duration-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  {
    variants: {
      look: {
        primary:
          'p-4 rounded-2xl h-10 bg-primary text-white w-fit select-none hover:bg-primary-300 active:bg-primary-200 disabled:bg-primary-100 disabled:opacity-100 disabled:pointer-events-none',
        secondary:
          'p-4 rounded-md h-10 w-fit select-none border bg-neutral-100 text-primary-foreground shadow-sm hover:bg-neutral-100 active:shadow-base active:press disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:opacity-100 disabled:pointer-events-none',
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
      state: {
        default: '',
        generating:
          'bg-primary-200 text-white hover:bg-primary-200 active:bg-primary-200 disabled:opacity-100 disabled:bg-primary-200',
        stopGenerating: '',
      },
    },
    defaultVariants: {
      look: 'secondary',
      state: 'default',
    },
  },
);

type ButtonProps = PropsOf<'button'> &
  VariantProps<typeof buttonVariants> & {
    hover?: boolean;
    isGenerating?: boolean;
    onStopGenerating?: () => void;
  };

export const Button = component$<ButtonProps>(
  ({
    size,
    look,
    state,
    hover = true,
    isGenerating = false,
    onStopGenerating,
    ...props
  }) => {
    const buttonHover = cn({
      'hover:bg-transparent': !hover,
    });

    return (
      <button
        {...props}
        class={cn(
          buttonVariants({
            size,
            look,
            state: isGenerating ? 'generating' : state,
          }),
          props.class,
          buttonHover,
        )}
        style={{
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          transform: 'translateY(0)',
          appearance: 'none',
          '-webkit-appearance': 'none',
        }}
      >
        <Slot />
      </button>
    );
  },
);
