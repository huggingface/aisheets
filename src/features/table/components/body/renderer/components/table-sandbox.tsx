import { component$ } from '@builder.io/qwik';

export const TableSandbox = component$<{ content: string }>(({ content }) => {
  const escapedContent = content.replace(/<\/script>/g, '<\\/script>');

  const html = `
  <head>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      }

      * {
        max-width: 100%;
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
  <body>${escapedContent}</body>
</html>`;

  return <div class="table-sandbox-content" dangerouslySetInnerHTML={html} />;
});
