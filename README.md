# n8n-nodes-declaw

This is an [n8n](https://n8n.io/) community node for [Declaw](https://declaw.ai) — secure Firecracker microVM sandboxes for AI agents and code execution.

Run untrusted code safely, manage files, and control sandbox lifecycles directly from your n8n workflows. Works as both a regular workflow node **and** as an AI Agent tool.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Nodes

This package provides two nodes:

| Node | Purpose |
|------|---------|
| **Declaw Code Interpreter** | One-shot secure code execution. Paste Python or JavaScript code, get output. Handles sandbox lifecycle automatically. |
| **Declaw** | Low-level API access. Full control over sandbox CRUD, commands, files, and snapshots for advanced workflows. |

## Installation

### Self-hosted n8n

Go to **Settings > Community Nodes** and install:

```
n8n-nodes-declaw
```

Or via CLI:

```bash
npm install n8n-nodes-declaw
```

### n8n Cloud

Search for "Declaw" in the community nodes catalog.

## Credentials

You need a Declaw API key. Get one at [declaw.ai](https://declaw.ai) or via the CLI:

```bash
declaw auth login
```

Configure the credential with:
- **API Key**: Your `dcl_...` key
- **API URL**: `https://api.declaw.ai` (default) or your self-hosted endpoint

## Declaw Code Interpreter

The simplest way to run code securely. Paste code, get output — no sandbox management needed.

### Parameters

| Parameter | Description |
|-----------|-------------|
| Language | Python or JavaScript |
| Code | The code to execute in the sandbox |

### Additional Options

| Option | Description |
|--------|-------------|
| Timeout | Execution timeout in seconds (default: 30) |
| Environment Variables | Key-value pairs injected into the sandbox |
| Additional Files | JSON array of `{path, data}` files to upload before execution |
| Output Files | Comma-separated file paths to download after execution |
| Enable PII Protection | Detect and redact sensitive data (SSN, credit cards, emails) |
| Enable Injection Defense | Block prompt injection attacks |
| Network Egress Allowlist | Restrict outbound access to specific domains |
| Security Policy (JSON) | Raw JSON security policy for full control |

### Example

```
[Webhook] -> [Declaw Code Interpreter (Python)] -> [Respond]
```

The node automatically: creates a sandbox, writes your code, executes it, downloads output files, kills the sandbox, and returns `{stdout, stderr, exit_code, output_files}`.

### As an AI Agent Tool

The Code Interpreter works as an AI Agent tool — an LLM agent can write and execute code securely without any manual sandbox wiring:

```
[Chat Trigger] -> [AI Agent] -> (tool) [Declaw Code Interpreter Tool]
```

To enable on self-hosted n8n:

```
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

## Declaw (Low-Level API)

For advanced workflows that need fine-grained control over sandbox lifecycles.

### Sandbox

| Operation | Description |
|-----------|-------------|
| Create | Create a new Firecracker microVM sandbox |
| Get Info | Get sandbox details |
| List | List all sandboxes |
| Kill | Destroy a sandbox |
| Pause | Freeze a running sandbox |
| Resume | Resume a paused sandbox |
| Set Timeout | Update auto-kill timeout |

### Command

| Operation | Description |
|-----------|-------------|
| Run | Execute a command and wait for stdout/stderr |
| Run Background | Start a command in the background (returns PID) |
| List Processes | List background processes |
| Kill Process | Kill a process by PID |

### File

| Operation | Description |
|-----------|-------------|
| Read | Read text file content |
| Read Binary | Download a binary file (images, archives, etc.) |
| Write | Write text to a file |
| Write Batch | Write multiple files at once |
| List Directory | List files and directories |
| Exists | Check if a path exists |
| Delete | Remove a file or directory |
| Make Directory | Create a directory |

### Snapshot

| Operation | Description |
|-----------|-------------|
| Create | Snapshot the current sandbox state |
| List | List all snapshots |
| Restore | Restore from a snapshot |
| Delete | Delete a snapshot |

### Persistent Sandbox Pattern

For AI agents that need to run multiple commands in the same sandbox (e.g., install packages then use them):

```
[Chat Trigger] -> [Declaw: Create Sandbox] -> [AI Agent] -> [Declaw: Kill Sandbox]
                                                  |
                                            (tool) [Declaw Tool]
                                            (uses sandbox ID from Create)
```

## Security Features

When creating a sandbox (either node), you can enable:

- **PII Protection** — Detect and redact sensitive data (SSN, credit cards, emails, etc.) in sandbox network traffic
- **Injection Defense** — Block prompt injection attacks with configurable sensitivity
- **Network Policies** — Restrict outbound access to specific domains

These can be configured via simple toggles or a raw JSON security policy for full control.

## Resources

- [Declaw Documentation](https://docs.declaw.ai)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
