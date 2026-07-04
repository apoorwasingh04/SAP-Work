# Docker command reference

> Run all of these from the project root: `vendor-invoice-platform/`.
> The UI/gateway is published on **http://localhost:8090** (host 8080 was taken).
>
> If `docker` is not found in your shell, either open a normal terminal (Docker
> Desktop adds it to PATH) or prefix with the full path:
> `"/c/Program Files/Docker/Docker/resources/bin/docker" ...`

## Lifecycle

```bash
docker compose up -d --build     # build images + start everything (detached)
docker compose up -d             # start without rebuilding
docker compose down              # stop + remove containers/network (keeps data)
docker compose down -v           # ALSO wipe Postgres volume -> fresh seed next up
docker compose restart           # restart all services
docker compose stop              # stop containers (keep them)
docker compose start             # start stopped containers
```

## Build

```bash
docker compose build                     # build all images
docker compose build invoice-service     # build one service
docker compose build --no-cache          # full clean rebuild
docker compose up -d --build invoice-service   # rebuild + (re)start one
```

## Status & logs

```bash
docker compose ps                        # running services
docker compose ps -a                     # include stopped/exited
docker compose logs -f                   # follow all logs
docker compose logs -f invoice-service   # follow one service
docker compose logs --tail=50 gateway    # last 50 lines
docker stats                             # live CPU/mem per container
```

## Per-service operations

```bash
docker compose restart approval-service
docker compose stop integration-service
docker compose up -d --scale invoice-service=3   # run 3 invoice instances
```

## Shell / debug inside a container

```bash
docker compose exec vendor-service sh            # shell into a service
docker compose exec vendor-service env | grep CDS_   # inspect its config
docker compose exec postgres psql -U postgres    # psql as superuser
docker compose exec postgres psql -U vip_app -d invoicedb -c '\dt'   # list tables
docker compose exec postgres psql -U vip_app -d invoicedb -c 'select invoiceNumber,status from invoice_Invoices;'
```

## Redeploy schema + seed for one service (one-off admin process)

```bash
docker compose exec invoice-service npx cds deploy
```

## Health / smoke tests (from host)

```bash
curl http://localhost:8090/health
curl -u admin:admin        http://localhost:8090/vendor/Vendors
curl -u viewer:viewer      http://localhost:8090/invoice/Invoices
curl -X POST -u admin:admin http://localhost:8090/integration/syncVendorsFromS4
```

## Run the unit tests (need Node 18+, not Docker)

```bash
make test                                  # all services + frontend
cd services/invoice-service && npm install && npm test
```

## Cleanup

```bash
docker compose down -v                     # remove containers + data volume
docker image prune -f                      # drop dangling images
docker system df                           # disk usage
docker builder prune -f                    # clear build cache
```

## Change the published port

Edit `docker-compose.yml` → `gateway.ports` (`"8090:8080"` = host:container),
then `docker compose up -d gateway`.
