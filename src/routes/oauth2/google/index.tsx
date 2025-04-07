import {
  component$,
  isServer,
  useSignal,
  useVisibleTask$,
} from '@builder.io/qwik';

export default component$(() => {
  const accessToken = useSignal<string | null>(null);

  useVisibleTask$(() => {
    if (isServer) return;

    accessToken.value =
      document.location.hash
        .slice(1) // Remove the leading '#'
        .split('&')
        .map((param) => param.split('='))
        .filter(([key]) => key === 'access_token')[0]?.[1] || null;
  });

  return (
    <div class="flex flex-col h-full w-fit overflow-hidden ml-4 mt-4">
      <h1 class="text-2xl font-bold">Add from Google Drive</h1>

      <p class="text-sm mt-4 gray-500">Click on the token area to copy</p>

      <pre
        class="flex flex-col mt-2 rounded-md p-4 w-fit"
        style="width: 70%; word-break: break-all; white-space: pre-wrap;"
      >
        <code
          id="access-token-code"
          class="text-m mt-8 border border-gray-300 bg-gray-100 rounded-md p-4 w-fit cursor-pointer"
          onClick$={() => {
            navigator.clipboard.writeText(accessToken.value || '');
            const codeElement = document.getElementById('access-token-code')!;
            const tooltip = document.createElement('div');
            tooltip.textContent = 'Copied!';
            tooltip.className =
              'absolute bg-gray-800 text-white text-sm rounded-md p-2';

            tooltip.style.opacity = '1';
            tooltip.style.top = `${codeElement.getBoundingClientRect().top}px`;
            tooltip.style.left = '70%';
            tooltip.style.transform = 'translate(-50%, -100%)';
            tooltip.style.zIndex = '1000';
            tooltip.style.transition =
              'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';

            document.body.appendChild(tooltip);

            setTimeout(() => {
              document.body.removeChild(tooltip);
            }, 1000);
          }}
        >
          {accessToken.value}
        </code>
      </pre>
    </div>
  );
});
