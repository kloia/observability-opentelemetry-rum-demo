/*
 * OpenTelemetry Web SDK bootstrap — Real User Monitoring for Juice Shop's frontend.
 * Not part of upstream Juice Shop; added for the RUM demo.
 */
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

// Host-relative, not "localhost": the page is loaded from the EC2's own address by a
// remote browser, so the exporter must point at that same address, not the visitor's machine.
const collectorUrl = `${window.location.protocol}//${window.location.hostname}:4318/v1/traces`

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'juice-shop-frontend' }),
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: collectorUrl }))]
})

provider.register({ contextManager: new ZoneContextManager() })

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation(),
    new FetchInstrumentation({
      // Juice Shop's own background chatter (i18n loads, admin config polling) is not
      // part of this demo's story; excluding it keeps the captured trace legible.
      ignoreUrls: [/\/assets\/i18n\//, /\/rest\/admin\/application-configuration/]
    })
  ]
})
