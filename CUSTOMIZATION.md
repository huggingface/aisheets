# Running Sheets with custom LLMs

By default, the Sheets app is configured to use the Huggingface Inference Providers API to run inference on the latest open-source models. However, you can also run Sheets with own custom LLMs, such as those hosted on your own infrastructure or other cloud providers. The only requirement is that your LLMs must support the [OpenAI API specification](https://platform.openai.com/docs/api-reference/introduction).

## Steps to run Sheets with custom LLMs

When running Sheets with custom LLMs, you need to set a couple of environment variables to point the inference calls to your custom LLMs. Here are the steps:

1. **Set the `MODEL_ENDPOINT_URL` environment variable**: This variable should point to the base URL of your custom LLM's API endpoint. For example, if you are using Ollama to run your LLM locally, you would set it like this:

```sh
export MODEL_ENDPOINT_URL=http://localhost:11434
```

Since Ollama starts a local server on port `11434` by default, this URL will point to your local Ollama instance.

2. **Set the `MODEL_ENDPOINT_NAME` environment variable**: This variable should specify the name of the model you want to use. For example, if you are using the `llama3` model, you would set it like this:

```sh
export MODEL_ENDPOINT_NAME=llama3
```

This is an important step to conform the OpenAI API specification. The model name is a required parameter in the [OpenAI API](https://platform.openai.com/docs/api-reference/responses/create#responses-create-model), and it is used to identify which model to use for inference.

3. **Run the Sheets app**: After setting the environment variables, you can run the Sheets app as usual. The app will now use your custom LLM for inference instead of the default Huggingface Inference Providers API as the default behavior. Anyway, all the models provided by the Huggingface Inference Providers API will still be available when selecting a model in the column settings.

* Note: The text-to-image generation feature cannot be customized yet. It will always utilize the Hugging Face Inference Providers API to generate images. Take this into account when running Sheets with custom LLMs.

## Example of running Sheets with Ollama

To run Sheets with Ollama, you can follow these steps:

1. Start the Ollama server, and run the model of your choice
```sh
export OLLAMA_NOHISTORY=1
ollama serve
```

```sh
ollama run llama3
```

(Visit the Ollama [FAQ](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-can-i-specify-the-context-window-size) page to know more about Ollama server configuration)

2. Set the environment variables:

```sh
export MODEL_ENDPOINT_URL=http://localhost:11434
export MODEL_ENDPOINT_NAME=llama3
```

3. Run the Sheets app:

```sh
pnpm serve
```

This will start the Sheets app, and it will use the `llama3` model running on your local Ollama instance for inference.
