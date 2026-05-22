# AI descriptions are opt-in — Google OAuth for Gemini, BYOK for everything else

We chose not to manage an AI subscription on behalf of users. AI-generated Step descriptions are opt-in and zero-cost to operate. When no AI is configured, the tool falls back to rule-based description generation using element text, labels, and aria attributes.

Two auth patterns are supported depending on the provider:

- **Google Gemini**: standard Google OAuth 2.0. The Recorder clicks "Connect with Google," authorizes the extension, and Gemini works immediately — no key pasting. This is the recommended path for most users since they already have a Google account.
- **Any other provider (OpenAI, Mistral, etc.)**: BYOK — the Recorder pastes their own API key in extension settings. The key is stored in `chrome.storage.local` and never leaves the device.

Both paths fall back silently to rule-based generation if the API call fails or no provider is configured.

## Considered options

- **Managed AI subscription** — rejected: adds ongoing cost, requires payment infrastructure, ties the tool to one provider
- **No AI at all** — rejected: AI-quality descriptions are a meaningful improvement for unlabeled or ambiguous elements
- **BYOK only** — considered but rejected as the sole option: pasting API keys is friction; most users already have a Google account and Gemini OAuth removes that friction entirely
- **Google OAuth only** — rejected: users with OpenAI or other API keys would be locked out
- **Google OAuth + BYOK fallback** — chosen: frictionless for most users, provider-agnostic for the rest

## Constraints discovered

- Anthropic has explicitly blocked OAuth for third-party apps (enforced from January 2026). Claude API access requires an API key — OAuth with a Claude subscription is not available.
- OpenAI's "Sign in with ChatGPT" is in testing as of May 2026 but does not grant API/model access to third-party apps.
- Google Gemini is the only major provider with a working, user-friendly OAuth flow for third-party extensions today.
