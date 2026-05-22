# No backend — file-based sharing only

We chose not to build a server or cloud storage for this tool. The core motivation is that internal guides will contain sensitive organizational information (internal URLs, workflows, credentials), and any external server creates a privacy risk and an ongoing maintenance burden. Instead, Recorders export a file (PDF, DOCX, HTML, or Markdown) and share it through channels they already trust — Slack, email, shared drives. This keeps the tool entirely local, removes infrastructure costs, and eliminates the exact problem that made Scribe impractical for internal use.

## Considered options

- **Server with shared guide library** — rejected because it requires hosting, auth, and puts internal data outside the organization's control
- **File-based sharing** — chosen: zero infrastructure, guides stay inside existing trusted channels
