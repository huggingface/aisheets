import { component$ } from '@builder.io/qwik';
import { TbPlus } from '@qwikest/icons/tablericons';

import { Breadcrumb } from '~/components/ui/breadcrumb/breadcrumb';
import { Button } from '~/components/ui/button/button';

export const NavBar = component$(() => {
  return (
    <nav class="mx-auto flex items-center justify-between px-4 pt-4">
      <Breadcrumb.Root>
        <Breadcrumb.List>
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Link href="/">Annotation</Breadcrumb.Link>
          </Breadcrumb.Item>
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <Button size="sm" look="ghost" class="flex items-center gap-1">
        <TbPlus />
        Create dataset
      </Button>
    </nav>
  );
});
