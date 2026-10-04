/*
 * OpenTelemetry Web SDK bootstrap — Real User Monitoring for Juice Shop's frontend.
 * Not part of upstream Juice Shop; added for the RUM demo.
 */
import { trace, SpanStatusCode } from '@opentelemetry/api'
import type { Span, Context } from '@opentelemetry/api'
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web'
import type { SpanProcessor } from '@opentelemetry/sdk-trace-web'
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

// Random id per browser tab. getRandomValues works on plain http, randomUUID does not.
const sessionId = (() => {
  let id = sessionStorage.getItem('rum.session')
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem('rum.session', id)
  }
  return id
})()

// Adds who-is-it context to every span. Booleans and a random id only: no email, no user id.
const sessionContext: SpanProcessor = {
  onStart (span: Span, _ctx: Context) {
    span.setAttribute('session.id', sessionId)
    span.setAttribute('user.logged_in', !!localStorage.getItem('token'))
  },
  onEnd () {},
  forceFlush: async () => {},
  shutdown: async () => {}
}

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'juice-shop-frontend' }),
  spanProcessors: [sessionContext, new BatchSpanProcessor(new OTLPTraceExporter({ url: collectorUrl }))]
})

provider.register({ contextManager: new ZoneContextManager() })

// Hash routes carry ids (/order-completion/5267-...): collapse them so routes stay countable.
const currentRoute = () =>
  (window.location.hash.replace(/^#/, '').split('?')[0] || '/').replace(/\/([0-9a-f-]{8,}|\d+)(?=\/|$)/gi, '/:id')

// What was clicked, in words. Never reads input values.
function describe (el: Element) {
  const target = el.closest('button, a, [routerlink], [role="button"], [aria-label]') ?? el
  // Inputs and whole forms can hold or contain user text: name them by id only.
  const idOnly = ['INPUT', 'TEXTAREA', 'SELECT', 'FORM'].includes(target.tagName)
  const text = idOnly ? '' : (target.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
  return {
    id: target.id,
    label: target.getAttribute('aria-label') ?? text,
    href: target.getAttribute('href') ?? target.getAttribute('routerlink') ?? ''
  }
}

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new DocumentLoadInstrumentation(),
    new UserInteractionInstrumentation({
      // Login runs on the form's submit event, not on a click, so listen for both.
      eventNames: ['click', 'submit'],
      // The hook gets the DOM element and the span: label the interaction, never drop it.
      shouldPreventSpanCreation: (event, element, span) => {
        const d = describe(element)
        span.setAttribute('ui.element.id', d.id)
        span.setAttribute('ui.element.label', d.label)
        span.setAttribute('ui.element.href', d.href)
        span.setAttribute('route', currentRoute())
        // Business context for the one click that matters most: which product went in the basket.
        if (element.closest('button.btn-basket')) {
          const product = element.closest('mat-card')?.querySelector('.name')?.textContent?.trim()
          if (product) span.setAttribute('product.name', product.slice(0, 60))
        }
        span.updateName(`${event} ${d.id || d.label || element.tagName.toLowerCase()}`)
        return false
      }
    }),
    new FetchInstrumentation({
      // Juice Shop's own background chatter (i18n loads, admin config polling) is not
      // part of this demo's story; excluding it keeps the captured trace legible.
      ignoreUrls: [/\/assets\/i18n\//, /\/rest\/admin\/application-configuration/]
    })
  ]
})

// Page views. documentLoad fires once per tab; this app moves between pages with the hash.
const tracer = trace.getTracer('rum-custom')
window.addEventListener('hashchange', () => {
  // What people search for is useful and also user-typed text: lowercase, trimmed, capped.
  const term = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('q')?.trim().toLowerCase().slice(0, 40)
  tracer.startSpan('navigation', { attributes: { route: currentRoute(), ...(term ? { 'search.term': term } : {}) } }).end()
})

// JS errors are not captured by the instrumentations above.
function reportError (type: string, message: unknown) {
  const span = tracer.startSpan('exception', {
    attributes: { 'exception.type': type, 'exception.message': String(message).slice(0, 120), route: currentRoute() }
  })
  span.setStatus({ code: SpanStatusCode.ERROR })
  span.end()
}
window.addEventListener('error', e => reportError('error', e.message))
window.addEventListener('unhandledrejection', e => reportError('unhandledrejection', (e.reason as Error)?.message ?? e.reason))
