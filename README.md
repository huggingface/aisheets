# easydatagen

## Dev dependencies on your vscode

### vitest runner

https://marketplace.visualstudio.com/items?itemName=rluvaton.vscode-vitest

### biome

https://marketplace.visualstudio.com/items?itemName=biomejs.biome

## Project Structure

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

## Development

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

## Preview

The preview command will create a production build of the client modules, a production build of `src/entry.preview.tsx`, and run a local server. The preview server is only for convenience to preview a production build locally and should not be used as a production server.

```shell
pnpm preview
```

## Production

The production build will generate client and server modules by running both client and server build commands. The build command will use Typescript to run a type check on the source code.

```shell
pnpm build
```

## Express Server

This app has a minimal [Express server](https://expressjs.com/) implementation. After running a full build, you can preview the build using the command:

```
pnpm serve
```

Then visit [http://localhost:8080/](http://localhost:8080/)
