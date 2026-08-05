# Local dev workflow. `make dev` runs the whole stack in one terminal.

SHELL := /bin/bash

.DEFAULT_GOAL := help

.PHONY: help dev preflight db db-down migrate run-profile run-platform run-admin test

help: ## list targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

dev: preflight db ## run postgres and all three services (ctrl-c stops the services)
	@echo ""
	@echo "  platform       http://localhost:3000"
	@echo "  admin console  http://localhost:5173"
	@echo "  profile api    http://localhost:3001"
	@echo "  postgres       localhost:5432 (stays up after ctrl-c: make db-down)"
	@echo ""
	@$(MAKE) --no-print-directory -j3 run-profile run-platform run-admin

preflight:
	@for port in 3000 3001 5173; do \
		pid=$$(lsof -nP -ti "tcp:$$port" -s tcp:LISTEN 2>/dev/null); \
		if [ -n "$$pid" ]; then \
			echo "port $$port is already in use by pid $$pid - stop it first: kill $$pid"; \
			exit 1; \
		fi; \
	done
	@for f in service/profile/.env web/platform/.env.local web/admin-console/.env; do \
		if [ ! -f "$$f" ]; then \
			echo "missing $$f - copy the .env.example next to it and fill it in"; \
			exit 1; \
		fi; \
	done

db: ## start postgres and wait until healthy
	@cd service/profile && podman compose up -d 2> /dev/null
	@until [ "$$(podman inspect --format '{{.State.Health.Status}}' profile_profile-db_1 2>/dev/null)" = "healthy" ]; do sleep 1; done
	@echo "postgres healthy on localhost:5432"

db-down: ## stop postgres (data volume survives)
	cd service/profile && podman compose down

migrate: db ## apply pending database migrations locally
	cd service/profile && go run ./cmd/migrate up

run-profile:
	@cd service/profile && go run ./cmd/server 2>&1 | sed -e $$'s/^/\033[32m[profile]\033[0m /'

run-platform:
	@cd web/platform && npm run dev 2>&1 | sed -e $$'s/^/\033[34m[platform]\033[0m /'

run-admin:
	@cd web/admin-console && npm run dev 2>&1 | sed -e $$'s/^/\033[35m[admin]\033[0m /'

test: ## backend tests plus frontend type-checks and lint
	cd service/profile && go vet ./... && go test ./...
	cd web/platform && npx tsc --noEmit && npm run lint
	cd web/admin-console && npm run build
