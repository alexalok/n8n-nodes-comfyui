![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-comfyui-ex

This package provides n8n nodes to integrate with [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - A powerful and modular stable diffusion GUI with a graph/nodes interface.

## Features

- Execute ComfyUI workflows directly from n8n
- Support for workflow JSON import
- Automatic image retrieval from workflow outputs
- Progress monitoring and error handling
- Support for API key authentication
- Configurable timeout settings

## Prerequisites

- n8n (version 1.0.0 or later)
- ComfyUI instance running and accessible
- Node.js 16 or newer

## Installation

```bash
npm install n8n-nodes-comfyui-ex
```

## Node Configuration

### ComfyUI Node

This node allows you to execute ComfyUI workflows and retrieve generated images.

#### Settings

- **API URL**: The URL of your ComfyUI instance (default: http://127.0.0.1:8188)
- **API Key**: Optional API key if authentication is enabled
- **Workflow JSON**: The ComfyUI workflow in JSON format

#### Outputs

The node outputs an array of generated images with:
- `filename`: Name of the generated image file
- `subfolder`: Subfolder path if any
- `data`: Base64 encoded image data

## Usage Example

1. Export your workflow from ComfyUI as JSON
2. Create a new workflow in n8n
3. Add the ComfyUI node
4. Paste your workflow JSON
5. Configure the API URL
6. Execute and retrieve generated images

## Error Handling

The node includes comprehensive error handling for:
- API connection issues
- Invalid workflow JSON
- Execution failures
- Timeout conditions (default 20 minutes)

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test

# Integration test
pnpm test:integration

# Lint
pnpm lint
```

`pnpm test:integration` builds this package, builds an n8n test image with the local node installed, starts n8n plus ComfyUI through Docker Compose, and verifies:

- n8n responds on `/healthz/readiness`
- ComfyUI responds on `/system_stats`
- n8n loads the ComfyUI node type in a fixture workflow
- the n8n container can reach ComfyUI by Compose service name

Default images:

- `docker.n8n.io/n8nio/n8n:2.20.6`
- `ghcr.io/ai-dock/comfyui:cpu-22.04`

Overrides:

```bash
N8N_IMAGE=docker.n8n.io/n8nio/n8n:2.20.6 \
COMFYUI_IMAGE=ghcr.io/ai-dock/comfyui:cpu-22.04 \
pnpm test:integration
```

First run pulls the ComfyUI CPU image and can take several minutes.

## License

[MIT](LICENSE.md)
 
