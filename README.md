# observability-opentelemetry-rum-demo

Real User Monitoring (RUM) with the OpenTelemetry Web SDK: page-load spans, click spans and
fetch spans, captured straight from the browser, with no backend instrumentation.

[OWASP Juice Shop](https://github.com/juice-shop/juice-shop) is the target app — a real,
actively-maintained Angular + Express SPA with zero existing OpenTelemetry code. It is not
vendored in this repo: `setup.sh` clones it fresh (pinned to `v20.2.0`) and applies a small
instrumentation overlay on top, so a `git diff` inside the clone shows exactly what was added.

```text
[ Your browser ] --page (:3000)--> [ EC2: juice-shop container ]
       │
       └--OTLP/HTTP (:4318, CORS)--> [ EC2: otel-collector ] --> [ EC2: tempo ] <-- [ EC2: grafana (:3001) ]
```

The browser making the page request is your own laptop, not the EC2 — so the exporter in
`overlay/frontend/src/tracer.ts` points at `window.location.hostname:4318`, never `localhost`.

## Repository layout

| Path | What it is |
| --- | --- |
| `infra/` | Terraform: one EC2 (Amazon Linux 2023, Docker pre-installed via `user_data`) + one security group |
| `overlay/` | The only code this repo owns: `tracer.ts`, a patched `main.ts`, a patched `frontend/package.json` |
| `setup.sh` | Clones Juice Shop, applies the overlay, runs `docker compose up --build` |
| `docker-compose.yml`, `otel-collector-config.yaml`, `tempo.yaml`, `grafana/` | The observability stack |

## Prerequisites

- AWS credentials in your shell, and your public IP (`curl -s https://checkip.amazonaws.com`).
- Terraform 1.9+.

## 1. Create the EC2 host

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars
# edit ssh_cidr to your IP with /32

terraform -chdir=infra init
terraform -chdir=infra apply
```

Outputs include `public_ip`, `ssh_command`, `juice_shop_url`, `grafana_url`. An SSH key pair
is generated for you (`infra/rum-demo-key.pem`, gitignored).

## 2. Deploy the stack

```bash
$(terraform -chdir=infra output -raw ssh_command)
# on the EC2:
git clone <this-repo-url>
cd observability-opentelemetry-rum-demo
./setup.sh
```

First build takes several minutes — the Dockerfile does a full `npm install` plus an Angular
production build. `docker compose ps` should show four containers running.

## 3. See it

Open `juice_shop_url` in a **real browser** (the OTLP export happens client-side) and click
around — view a product, add it to the cart. One fixed, narrow journey like this keeps the
captured trace legible; free-roaming the app pulls in its own background chatter (i18n
loads, challenge tracking) that `tracer.ts` already filters out of the fetch spans but not
out of clicks.

Open `grafana_url`, log in as `admin` with the password `setup.sh` printed at the end of its
run (it generates one and passes it to Compose — Grafana's port is public, so it is never
left at a weak default), and go to **Explore → Tempo**. Search by service name
`juice-shop-frontend`. A trace should show:

- a document-load span (`documentFetch`, `resourceFetch`, `domContentLoadedEvent`),
- a user-interaction span for the click,
- fetch spans for the API calls that click triggered.

No backend span — this is frontend-only RUM, deliberately. A fetch span with nothing to
join on the Tempo side is the expected, scoped result, not a bug.

## Iterating

Edit anything under `overlay/frontend/src/`, then on the EC2:

```bash
cp -r overlay/* juice-shop/
docker compose build juice-shop && docker compose up -d juice-shop
```

## Known gotchas

- **OTLP endpoint must be host-relative, not `localhost`.** The page is loaded from the
  EC2's IP by a remote browser; a hardcoded `localhost:4318` in `tracer.ts` would point at
  the visitor's own machine, not the collector.
- **Collector CORS is mandatory.** `otel-collector-config.yaml`'s `receivers.otlp.protocols.http.cors`
  block is what lets the browser's preflight `OPTIONS` through; without it nothing reaches Tempo.
- **Tempo storage is ephemeral.** `docker compose down -v` or an instance stop loses all
  traces — expected for a demo, not a bug.

## Cleanup

```bash
# on the EC2
docker compose down -v

# locally
terraform -chdir=infra destroy
```

## References

- [OpenTelemetry Web SDK](https://opentelemetry.io/docs/languages/js/getting-started/browser/)
- [OWASP Juice Shop](https://github.com/juice-shop/juice-shop)
- [Grafana Tempo](https://grafana.com/docs/tempo/latest/)

## License

MIT
