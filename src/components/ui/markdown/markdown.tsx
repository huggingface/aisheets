import { component$ } from '@builder.io/qwik';
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

const MARKED_OPTIONS: marked.MarkedOptions = {
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

    renderer.heading = (text: string | MarkdownToken, level: number) => {
      const headingText =
        typeof text === 'object' && 'tokens' in text
          ? (text.tokens?.[0]?.text ?? text.toString())
          : text;

      const size =
        HEADING_SIZES[level as keyof typeof HEADING_SIZES] ?? 'text-base';
      return `<h${level} class="${size} font-bold">${headingText}</h${level}>`;
    };

    return (
      <div
        class={`${className} break-words whitespace-normal`}
        dangerouslySetInnerHTML={marked.parse(content, {
          ...MARKED_OPTIONS,
          renderer,
        })}
      />
    );
  },
);
