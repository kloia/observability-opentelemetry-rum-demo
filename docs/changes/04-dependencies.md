# 4. Dependencies and the broken `sbom` step (both `package.json`)

## Backend: `overlay/package.json`, six packages added

```diff
   "dependencies": {
     "@ai-sdk/openai-compatible": "^2.0.35",
     "@fontsource/roboto": "^5.2.9",
+    "@opentelemetry/auto-instrumentations-node": "0.80.0",
+    "@opentelemetry/exporter-trace-otlp-http": "0.222.0",
+    "@opentelemetry/instrumentation-express": "0.70.0",
+    "@opentelemetry/resources": "2.11.0",
+    "@opentelemetry/sdk-node": "0.222.0",
+    "@opentelemetry/semantic-conventions": "1.43.0",
     "ai": "^6.0.116",
```

## Frontend: `overlay/frontend/package.json`, ten packages added

```diff
     "@ngx-translate/http-loader": "^17.0.0",
+    "@opentelemetry/api": "1.9.1",
+    "@opentelemetry/context-zone": "2.11.0",
+    "@opentelemetry/exporter-trace-otlp-http": "0.222.0",
+    "@opentelemetry/instrumentation": "0.222.0",
+    "@opentelemetry/instrumentation-document-load": "0.67.0",
+    "@opentelemetry/instrumentation-fetch": "0.222.0",
+    "@opentelemetry/instrumentation-user-interaction": "0.66.0",
+    "@opentelemetry/resources": "2.11.0",
+    "@opentelemetry/sdk-trace-web": "2.11.0",
+    "@opentelemetry/semantic-conventions": "1.43.0",
     "@wagmi/core": "^0.5.8",
```

All pinned exactly: OpenTelemetry's JS packages version independently (`2.x` stable SDK,
`0.2xx` experimental packages), and mixing minor versions is a common source of type errors.

## The `build` script (not an OpenTelemetry change)

**Before:**

```json
"build": "ng build --configuration production && npm run sbom",
```

**After:**

```json
"build": "ng build --configuration production",
```

**Why:** on `v20.2.0` the `sbom` step looks for `dist/frontend/stats.json`, which is never
produced. `statsJson: true` in `angular.json` is left over from the old webpack builder; the
project now uses `@angular/build:application`, whose schema has no such key. The build
fails after a successful compile. We do not need an SBOM for a demo. A real contribution
upstream would fix the builder config instead.

Back to the [index](README.md).
