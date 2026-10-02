/*
 * Backend auto-instrumentation — not part of upstream Juice Shop; added so the frontend's
 * fetch spans have a matching server span to join (same-origin fetch already carries
 * traceparent, so this is the only piece needed for a full distributed trace).
 */
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ExpressLayerType } from '@opentelemetry/instrumentation-express'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

const sdk = new NodeSDK({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'juice-shop-backend' }),
  // Container-to-container on the compose network; no CORS concern server-side.
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4318/v1/traces' }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Juice Shop reads SQLite/static files on nearly every request; fs instrumentation
      // is a well-known noise source and would flood Tempo with spans nobody asked for.
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Startup reachability checks (alchemy.com, a local LLM) produce rootless
      // tcp.connect/tls.connect traces that have nothing to do with the demo.
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      // Express wraps every middleware (cors, compression, i18n, ...) in its own span by
      // default -- about 20 per request. Keep only the router and the actual handler.
      '@opentelemetry/instrumentation-express': {
        ignoreLayersType: [ExpressLayerType.MIDDLEWARE]
      }
    })
  ]
})

sdk.start()
