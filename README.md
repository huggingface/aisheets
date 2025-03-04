# dataground - A tool to build smol datasets

`dataground` is an app for building high-quality datasets using AI models. It offers:

- **Real-time iteration**: Building high-quality and diverse datasets involves carefully designing and combining prompts, trying out different models, a lot of trial and error, and spending time looking at your data. `dataground` accelerates dataset iteration with an interactive and progressive workflow, enabling you to test many things and see the results instantly.
- **In-context learning using human demonstrations**: One of the biggest frustrations when building datasets with AI is prompts' brittleness. You often need to spend hours tuning the language of your prompt to avoid specific failures, ensure correct formatting, etc. Adding few-shot examples to your prompt is one of the most effective solutions to these issues. However, writing these examples by hand is time-consuming and challenging. In `dataground`, you just need to edit/select good examples, which are automatically included in the data generation process.
- **The latest open-source models**: `dataground` enables you to use the most advanced, fast, and powerful models, thanks to [Hugging Face Inference Providers](https://huggingface.co/blog/inference-providers).
- **Cost-efficiency**: Instead of launching 100s of inference calls to experiment with prompts and pipelines, `dataground` enables you to test and build in smol steps (a few rows at a time!). This saves money and energy and leads to higher-quality datasets; you get to look at your data and tune the generation process as you go.
- **Go from smol to great**:  Many big things, like the universe, start from something very smol. To build great datasets, it's better to build the perfect smol dataset for your use case and then scale it up. `dataground` enables you to build datasets and pipelines progressively. Once you're satisfied with your dataset, you can use the generated configuration to scale up the size of your dataset (if needed).

## Quick demo (TBD)

1. Launch the app locally or duplicate this space
2. Select a prompt and tune it for your use case, or import a Hugging Face Dataset.
3. Start adding columns and rows.
4. Push your dataset and pipeline config to the Hub.

See the video below to build a code problems dataset incrementally:

1. We create persona descriptions (a great way to improve the diversity of synthetic data) by iterating on the prompt.
2. We create coding problems by iterating on the prompt, selecting a good example with the desired format, and re-generating (just one example fixes the format for all cells!)
3. We create code solutions and so on.

<https://github.com/user-attachments/assets/bb0dae25-ed21-49c1-9be8-6b5866b90f52>

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

Then visit [http://localhost:8080/](http://localhost:8080/)
