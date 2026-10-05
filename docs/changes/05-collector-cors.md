# 5. Collector: CORS and scrubbing (`otel-collector-config.yaml`)

The collector is ours, not upstream's, but this is the change that most often makes browser
RUM silently produce nothing.

**Before** (what you would write for a backend-only setup):

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
```

**After:**

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins: ["*"]
          allowed_headers: ["*"]
```

**Why:** the page is served from `:3000` and exports to `:4318`, a different origin. The
browser sends a preflight `OPTIONS` first. Without the `cors` block the collector rejects it,
the exporter fails in the console, and Tempo stays empty. Nothing on the server side logs an error.

**For production:** `"*"` is a demo shortcut, because the EC2's IP is unknown until it exists.
List the exact origin of your site instead. A public collector endpoint also needs rate
limiting and ideally authentication in front of it: anyone can send spans to it.

Back to the [index](README.md).

## Scrubbing personal data before it is stored

**Before:** spans reach Tempo as the SDKs wrote them. Three attributes carried data we did not
choose to keep:

| Attribute | Written by | Example |
| --- | --- | --- |
| `url.full` on click and fetch spans | browser instrumentations | `http://host:3000/#/search?q=melon` |
| `url.query` on server spans | Node HTTP instrumentation | `EIO=4&transport=polling&t=...` |
| `client.address` on server spans | Node HTTP instrumentation | the visitor's IP address |

Switching `search.term` off in `tracer.ts` would not have removed the search term: it travels in
`url.full` as well.

**After:**

```yaml
processors:
  transform/scrub:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - replace_pattern(attributes["url.full"], "[?#].*", "") where attributes["url.full"] != nil
          - delete_key(attributes, "url.query")
          - delete_key(attributes, "client.address")
service:
  pipelines:
    traces:
      processors: [transform/scrub, batch]
```

**Verified** after the restart (2026-10-05): a TraceQL query for `url.full` containing `?` or `#`,
and one for `client.address` or `url.query` present, both returned 0 traces among spans created after
the change. A click span's `url.full` reads `http://host:3000/`.

**Why in the Collector and not the browser:** the backend's attributes never pass through browser
code, and one place is easier to review. Anything between the browser and the Collector (for
example a CDN or proxy log) still sees the original URL.

The same pipeline also looks up a country before the address is dropped: see
[change 8](08-device-and-country.md).
