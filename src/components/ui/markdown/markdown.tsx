import { component$ } from '@builder.io/qwik';
import { marked } from 'marked';

interface MarkdownProps {
  content: string;
  class?: string;
}

const HEADING_SIZES = {
  1: 'text-xl',
  2: 'text-lg',
  3: 'text-md',
  4: 'text-base',
  5: 'text-sm',
  6: 'text-xs',
} as const;

const MARKED_OPTIONS = {
  gfm: true,
  breaks: true,
  silent: true,
  pedantic: false,
  smartLists: true,
  smartypants: true,
  headerIds: false,
  mangle: false,
};

export const Markdown = component$<MarkdownProps>(
  ({ content, class: className }) => {
    const renderer = new marked.Renderer();

    renderer.heading = ({ text, depth }) => {
      const sizes = HEADING_SIZES as any;
      const sizeClass = sizes[depth] || sizes[4];

      return `<h${depth} class="${sizeClass} font-bold">${text}</h${depth}>`;
    };

    // Add styles for code blocks
    renderer.code = ({ text, lang }) => {
      return `<pre class="overflow-x-auto"><code class="language-${lang}">${text}</code></pre>`;
    };

    return (
      <div
        class={`${className} [overflow-wrap:anywhere] whitespace-normal prose max-w-full`}
        dangerouslySetInnerHTML={
          marked.parse(content, {
            ...MARKED_OPTIONS,
            renderer,
          }) as any
        }
      />
    );
  },
);
