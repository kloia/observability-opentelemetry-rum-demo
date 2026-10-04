# 3. Backend auto-instrumentation (`overlay/tracing.ts`, `overlay/app.ts`)

## `tracing.ts`

**Before:** does not exist. The backend emits nothing.
**After:** [35 lines](../../overlay/tracing.ts) starting a `NodeSDK` with
`getNodeAutoInstrumentations`, exporting to `http://otel-collector:4318` (container to
container, so no CORS question).

Three auto-instrumentations are tuned, each for a symptom we saw:

| Setting | Symptom without it |
| --- | --- |
| `instrumentation-fs: { enabled: false }` | Juice Shop reads SQLite and static files on almost every request; Tempo fills with file spans nobody asked for |
| `instrumentation-net` and `-dns` disabled | Startup reachability checks (alchemy.com, a local LLM) appear as rootless `tcp.connect` / `tls.connect` traces |
| `instrumentation-express: { ignoreLayersType: [MIDDLEWARE] }` | Every middleware gets a span, about 20 per request. We measured a request going from about 24 spans to 4 |

## `app.ts`

**Before** (upstream):

```ts
 * SPDX-License-Identifier: MIT
 */

async function app () {
```

**After:**

```ts
 * SPDX-License-Identifier: MIT
 */

// Static import, evaluated before anything below: instrumentation must patch http/express
// before `./server` (which requires them) is ever dynamically imported.
import './tracing'

async function app () {
```

**Why:** the Node instrumentations patch `http` and `express` when they are first
`require`d. Upstream loads the server with a dynamic `import()` inside `app()`, so a static
import at the top is the only way to be there first. Move it down and the app still runs,
with no server spans.

**What this buys:** the browser's fetch already sends a `traceparent` header (same origin),
so the backend span joins the frontend span in the same trace with no further frontend code.

Back to the [index](README.md).
