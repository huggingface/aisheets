import { component$, type PropsOf, Slot } from '@builder.io/qwik';
import { Modal as HeadlessModal } from '@qwik-ui/headless';
import { cn } from '@qwik-ui/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const Root = HeadlessModal.Root;

const Trigger = HeadlessModal.Trigger;

const Close = HeadlessModal.Close;

export const panelVariants = cva(
  [
    'fixed w-full bg-background p-6 text-foreground transition-all backdrop:brightness-50 backdrop:backdrop-blur-sm',
    'data-[closing]:duration-300 data-[open]:duration-300 data-[open]:animate-in data-[closing]:animate-out',
    'backdrop:data-[closing]:duration-300 backdrop:data-[open]:duration-300 backdrop:data-[open]:animate-in backdrop:data-[closing]:animate-out backdrop:data-[closing]:fade-out backdrop:data-[open]:fade-in',
  ],
  {
    variants: {
      position: {
        center:
          'max-w-lg rounded-base shadow-lg data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 backdrop:data-[closing]:fade-out backdrop:data-[open]:fade-in',
        top: 'inset-x-0 top-0 mt-0 rounded-b-base border-b data-[closing]:slide-out-to-top data-[open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 mb-0 rounded-t-base border-t data-[closing]:slide-out-to-bottom data-[open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 ml-0 h-full max-w-sm rounded-r-base border-r data-[closing]:slide-out-to-left data-[open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 mr-0 h-full max-w-sm rounded-l-base border-l data-[closing]:slide-out-to-right data-[open]:slide-in-from-right',
      },
    },
    defaultVariants: {
      position: 'center',
    },
  },
);

type PanelProps = PropsOf<typeof HeadlessModal.Panel> &
  VariantProps<typeof panelVariants>;

const Panel = component$<PanelProps>(({ position, ...props }) => {
  return (
    <HeadlessModal.Panel
      {...props}
      class={cn(panelVariants({ position }), props.class)}
    >
      <Slot />
    </HeadlessModal.Panel>
  );
});

const Title = component$<PropsOf<'h2'>>(({ ...props }) => {
  return (
    <HeadlessModal.Title
      {...props}
      class={cn('text-lg font-semibold tracking-tight', props.class)}
    >
      <Slot />
    </HeadlessModal.Title>
  );
});

const Description = component$<PropsOf<'p'>>(({ ...props }) => {
  return (
    <HeadlessModal.Description
      {...props}
      class={cn('text-sm text-muted-foreground', props.class)}
    >
      <Slot />
    </HeadlessModal.Description>
  );
});

export const Modal = {
  Root,
  Trigger,
  Close,
  Panel,
  Title,
  Description,
};
