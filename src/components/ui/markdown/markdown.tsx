import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import { marked } from 'marked';

interface MarkdownProps {
  content: string;
  class?: string;
}

interface MarkdownToken {
  tokens?: Array<{ text: string }>;
  toString: () => string;
}

const HEADING_SIZES = {
  1: 'text-2xl',
  2: 'text-xl',
  3: 'text-lg',
  4: 'text-base',
  5: 'text-sm',
  6: 'text-xs',
} as const;

export const Markdown = component$<MarkdownProps>(
  ({ content, class: className }) => {
    const renderer = {
      heading({ tokens, depth }: { tokens: MarkdownToken; depth: number }) {
        const headingText =
          typeof tokens === 'object' && 'tokens' in tokens
            ? (tokens.tokens?.[0]?.text ?? tokens.toString())
            : tokens;

        const size =
          HEADING_SIZES[depth as keyof typeof HEADING_SIZES] ?? 'text-base';
        return `<h${depth} class="${size} font-bold">${headingText}</h${depth}>`;
      },
    };

    marked.use({
      gfm: true,
      breaks: true,
      silent: true,
      pedantic: false,
      // smartLists: true,
      // smartypants: true,
      // headerIds: false,
      // mangle: false,
      renderer,
    });

    const markdownContent = useSignal<string>();

    useTask$(async () => {
      markdownContent.value = await marked.parse(content);
    });

    return (
      <div
        class={`${className} break-words whitespace-normal`}
        dangerouslySetInnerHTML={markdownContent.value}
      />
    );
  },
);
