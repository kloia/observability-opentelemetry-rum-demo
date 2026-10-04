# 5. Collector CORS (`otel-collector-config.yaml`)

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
