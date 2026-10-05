# 8. Device and country breakdowns

**Before:** every span says `service.name = juice-shop-frontend` and nothing about the
visitor's device or location. A dashboard can tell you the app is slow, not for whom.
**After:** coarse device facts are added in the browser, and a country is added in the
Collector. The new "Who your users are" row of the business dashboard splits page loads
and Apdex by both.

## Device: `overlay/frontend/src/tracer.ts`

```ts
const ua = navigator.userAgent
const deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop'
const browserName = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other'
const osName = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other'

const provider = new WebTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'juice-shop-frontend',
    'device.type': deviceType,
    'browser.name': browserName,
    'browser.platform': osName,
    'browser.mobile': deviceType !== 'desktop',
    'browser.language': navigator.language,
    'browser.timezone': Intl.DateTimeFormat().resolvedOptions().timeZone
  }),
```

These are resource attributes, so every span from the page carries them, and TraceQL reads
them as `resource.device.type`. Names only, no versions and no full user agent: enough to split
a chart, too little to fingerprint a visitor. The order of the tests matters: Android user agents
also contain "Linux", iPhone ones also contain "Mac OS X". `browser.timezone` is a rough location
hint that needs no IP address and no database.

## Country: `otel-collector-config.yaml`

Browser spans carry no IP address. The Collector knows the address that sent the OTLP request,
so it can look the country up there, before anything is stored:

```yaml
receivers:
  otlp:
    protocols:
      http:
        include_metadata: true          # lets processors read x-forwarded-for
processors:
  attributes/client_ip:                 # browser spans only
    include: { match_type: strict, services: [juice-shop-frontend] }
    actions:
      - { key: client.address, from_context: client.address, action: upsert }
      - { key: client.address, from_context: metadata.x-forwarded-for, action: upsert }
  geoip:
    context: record
    providers:
      maxmind:
        database_path: /etc/otelcol/GeoIP2-City-Test.mmdb
  transform/scrub:                      # existing; now also drops the finer geo fields
    ...
service:
  pipelines:
    traces:
      processors: [attributes/client_ip, transform/client_ip_clean, geoip, transform/scrub, batch]
```

`transform/client_ip_clean` keeps the first address of an `x-forwarded-for` list and strips a
port. `transform/scrub` deletes `client.address`, the city, the postal code, the coordinates,
the region and the time zone, so only `geo.country.*` and `geo.continent.*` reach Tempo.

**Verified on 2026-10-05:** 12 page loads from 6 emulated shoppers landed with the expected
device, browser, OS, time zone and country, and a query for spans that still had
`client.address`, `geo.city_name`, `geo.location.lat` or `geo.postal_code` returned 0 traces.

## The database, and what to use outside the lab

The GeoIP processor (alpha) accepts only MaxMind City databases: its MaxMind provider calls a
City lookup and rejects other database types, so free alternatives in the same file format,
such as DB-IP's, do not load. The lab uses **MaxMind's public test database** (Apache-2.0 or
MIT), pinned by commit in `setup.sh` and checked by SHA-256. It is fake data for a few
documentation IP addresses, which is why the lab's traffic sends those addresses in
`x-forwarded-for`. Real lookups need one of:

| Option | What it takes |
| --- | --- |
| MaxMind GeoLite2-City | A free MaxMind account and licence key; accept the EULA; the file may not be redistributed, so download it at deploy time |
| MaxMind GeoIP2 City | Paid; more accurate |
| A country header from your CDN or load balancer | Read it with `from_context: metadata.<header>` and skip the database |
| `browser.timezone` only | No database; a region, not a country |

**Trust `x-forwarded-for` only when your own load balancer sets it.** A browser can send any value.

## Traffic used for the screenshots

Six personas in Playwright: an emulated iPhone (London), Pixel 7 (Stockholm), desktop Chrome
(Los Angeles), desktop Firefox user agent (Shanghai), iPhone (Manila) and desktop Chrome
(London). The three mobile personas ran on a throttled network (150 ms extra latency, 1.6
Mbit/s down). Countries are simulated with the test-database IPs; devices are emulated user
agents on one Chromium engine.

Back to the [index](README.md).
