# Local dev workflow. `make dev` runs the whole stack in one terminal.
# The aws-* targets pause and resume the deployed dev environment.

SHELL := /bin/bash

AWS_REGION ?= ap-southeast-1
CLUSTER ?= rescufood-dev
DB_INSTANCE ?= rescufood-dev-db
SERVICES ?= web-platform profile

.DEFAULT_GOAL := help

.PHONY: help dev preflight db db-down migrate run-profile run-platform run-admin \
	test aws-status aws-pause aws-resume

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
	@cd service/profile && go run ./cmd/server 2>&1 | awk '{ printf "\033[32m[profile]\033[0m %s\n", $$0; fflush() }'

run-platform:
	@cd web/platform && npm run dev 2>&1 | awk '{ printf "\033[34m[platform]\033[0m %s\n", $$0; fflush() }'

run-admin:
	@cd web/admin-console && npm run dev 2>&1 | awk '{ printf "\033[35m[admin]\033[0m %s\n", $$0; fflush() }'

rds = aws rds --region $(AWS_REGION)
ecs = aws ecs --region $(AWS_REGION) --cluster $(CLUSTER)
rds_status = $$($(rds) describe-db-instances --db-instance-identifier $(DB_INSTANCE) \
	--query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null)

aws-status: ## show the deployed dev environment's running state
	@for s in $(SERVICES); do \
		$(ecs) describe-services --services $$s \
			--query "services[?status=='ACTIVE'].[serviceName,desiredCount,runningCount]" \
			--output text | grep . || echo "$$s	not deployed"; \
	done
	@echo "$(DB_INSTANCE)	$(rds_status)"

aws-pause: ## scale ecs services to zero and stop rds (saves ~40 usd/month)
	@for s in $(SERVICES); do \
		$(ecs) update-service --service $$s --desired-count 0 \
			--query 'service.serviceName' --output text | sed 's/^/scaled to zero: /' || true; \
	done
	@status=$(rds_status); \
	if [ "$$status" = "available" ]; then \
		$(rds) stop-db-instance --db-instance-identifier $(DB_INSTANCE) \
			--query 'DBInstance.DBInstanceStatus' --output text | sed 's/^/rds: /'; \
	else \
		echo "rds: $$status - not stopping"; \
	fi
	@echo "storage, secrets, the nat gateway and the alb still bill hourly"

aws-resume: ## start rds, wait for it, then scale ecs services back to one
	@status=$(rds_status); \
	if [ "$$status" = "stopping" ]; then \
		echo "rds: stopping - waiting for it to settle first"; \
		$(rds) wait db-instance-stopped --db-instance-identifier $(DB_INSTANCE); \
		status=stopped; \
	fi; \
	if [ "$$status" = "stopped" ]; then \
		$(rds) start-db-instance --db-instance-identifier $(DB_INSTANCE) \
			--query 'DBInstance.DBInstanceStatus' --output text | sed 's/^/rds: /'; \
	else \
		echo "rds: $$status"; \
	fi
	@echo "waiting for the database..."
	@$(rds) wait db-instance-available --db-instance-identifier $(DB_INSTANCE)
	@for s in $(SERVICES); do \
		$(ecs) update-service --service $$s --desired-count 1 \
			--query 'service.serviceName' --output text | sed 's/^/scaled to one: /' || true; \
	done
	@echo "tasks need about a minute to pass health checks"

test: ## backend tests plus frontend type-checks and lint
	cd service/profile && go vet ./... && go test ./...
	cd web/sdk && npm run check
	cd web/ui && npm run check
	cd web/platform && npx tsc --noEmit && npm run lint
	cd web/admin-console && npm run build
