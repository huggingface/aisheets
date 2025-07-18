# Sheets

`Sheets` is a tool for building datasets using AI models. It offers:

- **Real-time iteration**: Building high-quality and diverse datasets involves carefully designing and combining prompts, trying out different models, a lot of trial and error, and spending time looking at your data. `Sheets` accelerates dataset iteration with an interactive and progressive workflow, enabling you to test many things and see the results instantly.
- **In-context learning using human demonstrations**: One of the biggest frustrations when building datasets with AI is prompts' brittleness. You often need to spend hours tuning the language of your prompt to avoid specific failures, ensure correct formatting, etc. Adding few-shot examples to your prompt is one of the most effective solutions to these issues. However, writing these examples by hand is time-consuming and challenging. In `Sheets`, you just need to edit/select good examples, which are automatically included in the data generation process.
- **The latest open-source models**: `Sheets` enables you to use the latest and most powerful models, thanks to [Hugging Face Inference Providers](https://huggingface.co/blog/inference-providers).
- **Cost-efficiency**: Instead of launching 100s of inference calls to experiment with prompts and pipelines, `Sheets` enables you to test and build in smol steps (a few rows at a time!). This saves money and energy and leads to higher-quality datasets; you get to look at your data and tune the generation process as you go.
- **Go from smol to great**:  Many big things, like the universe, start from something very smol. To build great datasets, it's better to build the perfect small dataset for your use case and then scale it up. `Sheets` enables you to build datasets and pipelines progressively. Once you're satisfied with your dataset, you can use the generated configuration to scale up the size of your dataset (if needed).

## Quick demo (TBD)

<https://github.com/user-attachments/assets/29e790d4-df29-4452-96f1-0069d45a1da9>

## Developer docs

### Dev dependencies on your vscode

#### vitest runner

<https://marketplace.visualstudio.com/items?itemName=rluvaton.vscode-vitest>

#### biome

<https://marketplace.visualstudio.com/items?itemName=biomejs.biome>

### Project Structure

This project is using Qwik with [QwikCity](https://qwik.dev/qwikcity/overview/). QwikCity is just an extra set of tools on top of Qwik to make it easier to build a full site, including directory-based routing, layouts, and more.

Inside your project, you'll see the following directory structure:

```
├── public/
│   └── ...
└── src/
    ├── components/ --> Stateless components
    │   └── ...
    ├── features/ --> Components with business logic
    │   └── ...
    └── routes/
        └── ...
```

- `src/routes`: Provides the directory-based routing, which can include a hierarchy of `layout.tsx` layout files, and an `index.tsx` file as the page. Additionally, `index.ts` files are endpoints. Please see the [routing docs](https://qwik.dev/qwikcity/routing/overview/) for more info.

- `src/components`: Recommended directory for components.

- `public`: Any static assets, like images, can be placed in the public directory. Please see the [Vite public directory](https://vitejs.dev/guide/assets.html#the-public-directory) for more info.

### Development

Run this on your root folder

```sh
touch .env.local
```

Add in your `.env.local` file the following variables:

```
OAUTH_CLIENT_ID
HF_TOKEN=X
```

Please note that if you define the `HF_TOKEN`, this variable will take priority over `OAUTH_CLIENT_ID`.

Development mode uses [Vite's development server](https://vitejs.dev/). The `dev` command will server-side render (SSR) the output during development.

```shell
pnpm dev
```

> Note: during dev mode, Vite may request a significant number of `.js` files. This does not represent a Qwik production build.

### Preview

The preview command will create a production build of the client modules, a production build of `src/entry.preview.tsx`, and run a local server. The preview server is only for convenience to preview a production build locally and should not be used as a production server.

```shell
pnpm preview
```

### Production

The production build will generate client and server modules by running both client and server build commands. The build command will use Typescript to run a type check on the source code.

```shell
pnpm build
```

### Express Server

This app has a minimal [Express server](https://expressjs.com/) implementation. After running a full build, you can preview the build using the command:

```
pnpm serve
```

Then visit [http://localhost:3000/](http://localhost:3000/)

### Environment Variables

Sheets defines some environment variables that can be used to customize the behavior of the application. In the following sections, we will describe the available environment variables and their usage.

####  Authentication

- `OAUTH_CLIENT_ID`: The Hugging Face OAuth client ID for the application. This is used to authenticate users via the Hugging Face OAuth. If this variable is defined, it will be used to authenticate users. (See how to setup the Hugging Face OAuth [here](https://huggingface.co/blog/frascuchon/running-sheets-locally#oauth-authentication)).

- `HF_TOKEN`: A Hugging Face token to use for authentication. If this variable is defined, it will be used for authenticate inference calls, instead of the OAuth token.

- `OAUTH_SCOPES`: The scopes to request during the OAuth authentication. The default value is `openid profile inference-api manage-repos`. This variable is used to request the necessary permissions for the application to function correctly, and normally does not need to be changed.

####  Inference

- `DEFAULT_MODEL`: The default model id to use when calling the inference API for text generation. The default value is `meta-llama/Llama-3.3-70B-Instruct`. This variable can be used to change the default model used for text generation and must be a valid model id from the [Hugging Face Hub](https://huggingface.co/models?pipeline_tag=text-generation&inference_provider=all&sort=trending),

- `DEFAULT_MODEL_PROVIDER`: The default model provider to use when calling the inference API for text generation. The default value is `nebius`. This variable can be used to change the default model provider used for text generation and must be a valid provider from the [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/en/index).

- `ORG_BILLING`: The organization billing to use for inference calls. If this variable is defined, the inference calls will be billed to the specified organization. This is useful for organizations that want to manage their inference costs and usage. Remeber that users must be part of the organization to use this feature, or a `HF_TOKEN` of a user that is part of the organization must be defined.

- `MODEL_ENDPOINT_URL`:  The URL of a custom inference endpoint to use for text generation. If this variable is defined, it will be used instead of the default Hugging Face Inference API. This is useful for using custom inference endpoints that are not hosted on the Hugging Face Hub, such as Ollama or LLM Studio. The URL must be a valid endpoint that supports the [OpenAI API format](https://platform.openai.com/docs/api-reference/chat/create).

- `MODEL_ENDPOINT_NAME`: The model id to use when calling the custom inference endpoint defined by `MODEL_ENDPOINT_URL`. This variable is required if `MODEL_ENDPOINT_URL` is defined for custom inference endpoints that require a model id, such as Ollama or LLM Studio. The model id must correspond to the model deployed on the custom inference endpoint.

- `NUM_CONCURRENT_REQUESTS`: The number of concurrent requests to allow when calling the inference API in the column cells generation process. The default value is `5`, and the maximum value is `10`. This is useful to control the number of concurrent requests made to the inference API and avoid hitting rate limits defined by the provider.

#### Miscellaneous

- `DATA_DIR`: The directory where the application will store all its data. The default value is `./data`. This variable can be used to change the data directory used by the application. The directory must be writable by the application.

- `SERPER_API_KEY`: The API key to use for the Serper web search API. If this variable is defined, it will be used to authenticate web search requests. If this variable is not defined, web search will be disabled. The Serper API key can be obtained from the [Serper website](https://serper.dev/).

- `TELEMETRY_ENABLED`: A boolean value that indicates whether telemetry is enabled or not. The default value is `1`. This variable can be used to disable telemetry if desired. Telemetry is used to collect anonymous usage data to help improve the application.

- `EXAMPLES_PROMPT_MAX_CONTEXT_SIZE`: The maximum context size (in characters) for the examples section in the prompt for text generation. The default value is `8192`. If the examples section exceeds this size, it will be truncated. This variable can be used when the examples section is too large and needs to be reduced to fit within the context size limits of the model.

- `SOURCES_PROMPT_MAX_CONTEXT_SIZE`: The maximum context size (in characters) for the sources section in the prompt for text generation. The default value is `61440`. If the sources section exceeds this size, it will be truncated. This variable can be used when the sources section is too large and needs to be reduced to fit within the context size limits of the model.
