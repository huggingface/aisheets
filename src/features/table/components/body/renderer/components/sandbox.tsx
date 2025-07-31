import { component$ } from '@builder.io/qwik';

export const Sandbox = component$<{ content: string }>(({ content }) => {
  return (
    <iframe
      title="HTML"
      class="w-full h-full border-none"
      srcdoc={`<html>
<head>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      }

      * {
        max-width: 100%;
        max-height: 100%;
        box-sizing: border-box;
      }

      svg, img {
        max-width: 100%;
        max-height: 100%;
        display: block;
      }

      pre, code {
        margin: 0;
        padding: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>${content}</body>
</html>`}
    />
  );
});
