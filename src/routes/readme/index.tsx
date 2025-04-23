import { component$ } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div class="flex flex-col items-left justify-center h-screen">
      <h1 class="text-4xl font-bold">Dataground AISheet</h1>

      <p>
        `dataground` is a tool for building datasets using AI models. It offers:
      </p>

      <ul class="list-disc pl-5">
        <li>
          <b>Real-time iteration:</b> Building high-quality and diverse datasets
          involves carefully designing and combining prompts, trying out
          different models, a lot of trial and error, and spending time looking
          at your data. `dataground` accelerates dataset iteration with an
          interactive and progressive workflow, enabling you to test many things
          and see the results instantly.
        </li>
        <li>
          <b>In-context learning using human demonstrations:</b> One of the
          biggest frustrations when building datasets with AI is prompts'
          brittleness. You often need to spend hours tuning the language of your
          prompt to avoid specific failures, ensure correct formatting, etc.
          Adding few-shot examples to your prompt is one of the most effective
          solutions to these issues. However, writing these examples by hand is
          time-consuming and challenging. In `dataground`, you just need to
          edit/select good examples, which are automatically included in the
          data generation process.
        </li>
        <li>
          <b>The latest open-source models:</b> `dataground` enables you to use
          the latest and most powerful models, thanks to [Hugging Face Inference
          Providers](https://huggingface.co/blog/inference-providers).
        </li>
        <li>
          <b>Cost-efficiency:</b> Instead of launching 100s of inference calls
          to experiment with prompts and pipelines, `dataground` enables you to
          test and build in smol steps (a few rows at a time!). This saves money
          and energy and leads to higher-quality datasets; you get to look at
          your data and tune the generation process as you go.
        </li>
        <li>
          <b>Go from smol to great:</b> Many big things, like the universe,
          start from something very smol. To build great datasets, it's better
          to build the perfect small dataset for your use case and then scale it
          up. `Dataground` enables you to build datasets and pipelines
          progressively. Once you're satisfied with your dataset, you can use
          the generated configuration to scale up the size of your dataset (if
          needed).
        </li>
      </ul>

      <p>
        Please read our{' '}
        <a
          href="https://huggingface.co/terms-of-service"
          target="_blank"
          class="text-blue-500 hover:underline"
          rel="noopener noreferrer"
        >
          Terms of Service
        </a>
        .
      </p>

      <p>
        Please read our{' '}
        <a
          href="https://huggingface.co/privacy"
          class="text-blue-500 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
});
