# Self-hosting RecipeRescue

Start with the [README quick start](../README.md#quick-start). This guide covers configuration and operation of a single persistent server.

## Configuration

Use `.env.local` for local Next.js development. Docker Compose reads `.env` for variable substitution. Both can start from [`.env.example`](../.env.example); keep credentials out of version control.

### Provider settings

| Variable             | Default                     | Purpose                                                                                        |
| -------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| `DEMO_MODE`          | `true`                      | Use the scripted cinnamon-roll example without contacting a provider.                          |
| `AI_BASE_URL`        | `https://api.openai.com/v1` | Base URL for the provider's OpenAI-compatible API.                                             |
| `AI_MODEL`           | Empty                       | Model ID. Required when demo mode is off.                                                      |
| `AI_API_KEY`         | Empty                       | Bearer token. An empty value omits the authorization header.                                   |
| `AI_RESPONSE_FORMAT` | `json_schema`               | Accepts `json_schema`, `json_object`, or `none`. All responses are still validated.            |
| `AI_SUPPORTS_IMAGES` | `false`                     | Enable only when the model accepts OpenAI-compatible `image_url` input. Disabled in demo mode. |
| `AI_TIMEOUT_MS`      | `45000`                     | Request timeout, from 1,000 to 120,000 milliseconds.                                           |

The adapter sends `POST {AI_BASE_URL}/chat/completions`. Remote endpoints require HTTPS. URLs containing credentials, query parameters, or fragments are rejected. Provider settings are read at runtime; a build does not require credentials.

Response-format support varies by provider. If strict JSON schema is unsupported, try `json_object`, then `none`. Malformed or incomplete output remains an error; these settings do not bypass validation.

### Local models

For a local Ollama endpoint, use `AI_BASE_URL=http://localhost:11434/v1`, set `AI_MODEL` to an installed model, and leave `AI_API_KEY` empty. Test the chosen model's response format and image support before relying on it.

Inside Docker, `localhost` points to the container. To reach a provider running on the host, use `http://host.docker.internal:11434/v1`. Linux hosts may need a `host-gateway` mapping. The hostname `ollama` is also allowed for an HTTP provider on the container network.

### Application settings

| Variable        | Default                                       | Purpose                                                                                                                                                  |
| --------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_PATH` | `./data/reciperescue.db`                      | SQLite location for local runs. The Docker image uses `/app/data/reciperescue.db`.                                                                       |
| `APP_ORIGIN`    | Request origin derived from protocol and Host | HTTP(S) origin for same-origin checks, such as `https://rescue.example.com`. A trailing slash is normalized; paths, credentials, queries, and fragments are rejected. Compose defaults to `http://localhost:3000`. |

`BUILD_STANDALONE` is a build-only setting. Leave it `false` for `npm start`. The Docker build sets it to `true` and runs the generated standalone server with its static assets.

Set `APP_ORIGIN` explicitly behind a reverse proxy. Open the app through that same origin; mismatches return HTTP 403.

## Docker

```sh
docker compose up --build
```

Compose binds port 3000 to the host's loopback interface. Open [localhost:3000](http://localhost:3000). The image runs as a non-root user and stores SQLite in the `rescue-data` volume.

To configure a provider, copy `.env.example` to `.env`, edit it, and recreate the container with `docker compose up -d`. Do not delete the volume unless you intend to remove its data.

For a persistent Node server without Docker:

```sh
npm run build
npm start
```

## Storage and privacy

Recipes, feedback, and results expire 24 hours after the rescue was created. Expired records are deleted on the next database read or write, not by a background timer. Backups and filesystem snapshots can retain them longer. SQLite secure deletion is enabled, but filesystem-level erasure is not guaranteed.

A random HttpOnly, SameSite=Strict cookie identifies the browser session. The database stores a hash of that token and checks ownership on follow-up requests. There is no public history endpoint. Reloading the page clears the visible form; there is no saved-history screen.

Photos are decoded, stripped of metadata, resized, and sent to the configured provider. They are not stored in SQLite. Follow-up requests include the prior text analysis but do not resend the original photo. The provider has its own retention policy.

The app does not log request bodies, credentials, or provider error bodies. A failed database write leaves the result visible and disables follow-up, with a message explaining that it was not saved. Concurrent updates use a conditional database write: a stale response returns HTTP 409 instead of replacing newer guidance.

## Safety behavior

Explicit or uncertain safety concerns, English keyword screening, and model-reported safety concerns pause the rescue. The app replaces model steps with maintained safety guidance. Follow-up text cannot clear that hold or downgrade an unsafe classification.

The policy, source link, and review date live in [src/domain/safety.ts](../src/domain/safety.ts). Review them before a public release and whenever the source changes. Screening cannot detect every hazard, photos cannot establish safety, and generated cooking advice can still be wrong.

## Deployment limits

The app has no authentication or account-based quotas. Request limits are process-local: ten requests per session per minute and four active requests across the process. A new cookie can bypass the session quota; multiple processes do not share counters.

Before exposing a paid provider publicly, add authentication, shared rate limits, spending limits, TLS, and proxy request-size and timeout limits. Use a persistent filesystem for SQLite, not ephemeral serverless storage.

The current schema is initialized with `CREATE TABLE IF NOT EXISTS`. Add versioned migrations before changing a released database schema. A different storage implementation can use the existing `RescueRepository` interface.

## Installation troubleshooting

`better-sqlite3` uses a native module. If no binary is available for your Node version and platform, installation needs a compiler toolchain. On Windows, install Visual Studio C++ Build Tools and Python, or use Docker, whose build stage includes the tools.

If the API returns 403, check that the address in your browser matches `APP_ORIGIN`. If photos are unavailable, check that demo mode is off and `AI_SUPPORTS_IMAGES=true`. If the provider rejects a request, check its model ID, credentials, and supported response format.
