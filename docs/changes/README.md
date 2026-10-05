# Changes, one file each

Every change this repo makes to OWASP Juice Shop `v20.2.0` (or adds beside it), shown as
**before** and **after**. "Before" is the pristine upstream file, or "does not exist" for
files we add. The upstream code is never vendored: `setup.sh` clones it and copies `overlay/`
on top, so `git diff` inside the clone shows the same thing as these pages.

| # | Change | Where | Size |
| --- | --- | --- | --- |
| 1 | [Frontend tracer, built up in layers](01-frontend-tracer.md) | `overlay/frontend/src/tracer.ts` (new) | about 150 lines, 35 for the basics |
| 2 | [One import in the Angular entry point](02-frontend-main-import.md) | `overlay/frontend/src/main.ts` | +3 lines |
| 3 | [Backend auto-instrumentation](03-backend-tracing.md) | `overlay/tracing.ts` (new), `overlay/app.ts` | 35 lines + 4 |
| 4 | [Dependencies and the broken `sbom` step](04-dependencies.md) | both `package.json` | +6 and +10 deps, 1 script |
| 5 | [Collector: CORS and scrubbing](05-collector-cors.md) | `otel-collector-config.yaml` | CORS block, scrub processor |
| 6 | [Technical dashboard](06-technical-dashboard.md) | `grafana/dashboards/rum.json` | 5 panels |
| 7 | [Business dashboard](07-business-dashboard.md) | `grafana/dashboards/rum-business.json` | 13 panels, plus the row in 8 |
| 8 | [Device and country breakdowns](08-device-and-country.md) | `tracer.ts`, `otel-collector-config.yaml`, `setup.sh`, dashboard | 7 resource attributes, 3 processors, 6 panels |

Back to the [main README](../../README.md).
