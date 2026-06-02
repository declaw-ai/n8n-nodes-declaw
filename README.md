# n8n-nodes-declaw

This is an [n8n](https://n8n.io/) community node for [Declaw](https://declaw.ai) — secure Firecracker microVM sandboxes for AI agents and code execution.

Run untrusted code safely, manage files, and control sandbox lifecycles directly from your n8n workflows. Works as both a regular workflow node **and** as an AI Agent tool.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

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

## Operations

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

## Security Features

When creating a sandbox, you can enable:

- **PII Protection** — Detect and redact sensitive data (SSN, credit cards, emails, etc.) in sandbox network traffic
- **Injection Defense** — Block prompt injection attacks with configurable sensitivity
- **Network Policies** — Restrict outbound access to specific domains

These can be configured via simple toggles or a raw JSON security policy for full control.

## AI Agent Tool

This node works as an AI Agent tool. AI agents in n8n can autonomously create sandboxes, run code, and read results.

To enable on self-hosted n8n, set:

```
N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
```

Then connect the Declaw node as a tool to any AI Agent node.

## Example Workflow

```
[Webhook] -> [Declaw: Create Sandbox] -> [Declaw: Run Command] -> [Declaw: Read File] -> [Declaw: Kill Sandbox] -> [Respond]
```

Typical use cases:
- **AI code execution** — LLM generates code, Declaw runs it safely
- **Data processing** — Upload data, run analysis in isolated sandbox, return results
- **CI/CD** — Webhook triggers sandbox, runs tests, reports results

## Resources

- [Declaw Documentation](https://docs.declaw.ai)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
