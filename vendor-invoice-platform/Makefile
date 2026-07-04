SERVICES := vendor-service invoice-service approval-service integration-service

.PHONY: up down build rebuild logs ps test test-backend test-frontend install clean seed

## Start the whole platform (build if needed)
up:
	docker compose up --build -d
	@echo "Gateway + UI:  http://localhost:8080"

## Stop and remove containers
down:
	docker compose down

## Stop and also wipe the Postgres volume (fresh seed on next up)
clean:
	docker compose down -v

build:
	docker compose build

rebuild:
	docker compose build --no-cache

logs:
	docker compose logs -f

ps:
	docker compose ps

## Run ALL unit tests (each service + frontend)
test: test-backend test-frontend

test-backend:
	@for s in $(SERVICES); do \
		echo "==== $$s ===="; \
		(cd services/$$s && npm test) || exit 1; \
	done

test-frontend:
	@echo "==== frontend ===="
	@cd frontend && npm test

## Install dependencies everywhere (Node 18+ required)
install:
	@for s in $(SERVICES); do (cd services/$$s && npm install); done
	@cd frontend && npm install

## Regenerate seed CSVs (deterministic, cross-service consistent ids)
seed:
	node scripts/gen-seed.js .
