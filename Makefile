##
## ┌────────────────────────────────────────────────────────────────────────────
## │ @author        Christophe Vandevoir
## ├────────────────────────────────────────────────────────────────────────────
## │ @file          Makefile
## │ @path          Makefile
## │ @description   Docker environment manager
## │ @version       1.1.0
## │
## │ @email         christophe.vandevoir@epitech.eu
## │ @date          2025-05-01
## ├────────────────────────────────────────────────────────────────────────────
## │ @copyright     (c) 2025 Christophe Vandevoir
## └────────────────────────────────────────────────────────────────────────────
##

PROJECT=pooltracker_prod
DEV_PROJECT=pooltracker_dev

# Compose files
COMPOSE_PROD	=	docker-compose.yml
COMPOSE_DEV		=	docker-compose.dev.yml

# Compose commands
DC	=	docker compose -p $(PROJECT) -f docker-compose.yml
DC_DEV	=	docker compose -p $(DEV_PROJECT) -f docker-compose.dev.yml

# Colors
BLUE	=	\033[1;34m
GREEN	=	\033[1;32m
YELLOW	=	\033[1;33m
RED		=	\033[1;31m
RESET	=	\033[0m

.PHONY: help build up down restart logs clean

define step
	@printf "$(BLUE)==> $(1)$(RESET)\n"
endef

define done
	@printf "$(GREEN)[✔] Done.$(RESET)\n"
endef

define loading
	@for i in 1 2 3; do printf "$(YELLOW)."; sleep 0.3; done; printf "$(RESET)\n"
endef

all:
	$(call step,"Building production images...")
	$(DC) build
	$(call done)
	$(call step,"Starting production containers...")
	$(DC) up -d
	$(call done)

# Production
build:
	$(call step,"Building production images...")
	$(DC) build
	$(call done)

build-no-cache:
	$(call step,"Building production images (no cache)...")
	$(DC) build --no-cache
	$(call done)

start:
	$(call step,"Starting production containers...")
	$(DC) up -d
	$(call done)

stop:
	$(call step,"Stopping production containers...")
	$(DC) stop
	$(call done)

down:
	$(call step,"Stopping all containers...")
	$(DC) down
	$(call done)

restart:
	$(call step,"Restarting production containers...")
	$(DC) down
	$(call loading)
	$(DC) up -d --build
	$(call done)

logs:
	$(call step,"Showing logs 'press Ctrl+C to exit'...")
	$(DC) logs -f

# Development
dev:
	$(call step,"Starting development environment...")
	$(DC_DEV) up

dev-build:
	$(call step,"Building and starting development environment...")
	$(DC_DEV) up --build

dev-up:
	$(call step,"Starting development containers in background...")
	$(DC_DEV) up -d
	$(call done)

dev-down:
	$(call step,"Stopping development containers...")
	$(DC_DEV) down
	$(call done)

dev-logs:
	$(call step,"Showing development logs 'press Ctrl+C to exit'...")
	$(DC_DEV) logs -f

dev-logs-client:
	$(call step,"Showing client logs...")
	$(DC_DEV) logs -f client

dev-logs-server:
	$(call step,"Showing server logs...")
	$(DC_DEV) logs -f server

dev-restart:
	$(call step,"Restarting development containers...")
	$(DC_DEV) restart
	$(call done)

dev-clean:
	$(call step,"Cleaning development environment...")
	$(DC_DEV) down -v
	$(call done)

# Cleanup
clean:
	$(call step,"Removing containers...")
	$(DC) down -v --rmi all --remove-orphans
	$(call done)

re: clean all

help:
	@echo ""
	@echo "$(YELLOW)📦 Docker Environment Commands:$(RESET)"
	@echo ""
	@echo "$(BLUE)Production:$(RESET)"
	@echo "  $(GREEN)make build$(RESET)     → Build production images"
	@echo "  $(GREEN)make start$(RESET)     → Start production containers"
	@echo "  $(GREEN)make stop$(RESET)      → Stop production containers"
	@echo "  $(GREEN)make down$(RESET)      → Stop and remove all containers"
	@echo "  $(GREEN)make restart$(RESET)   → Restart production containers"
	@echo "  $(GREEN)make logs$(RESET)      → Show production logs"
	@echo "  $(GREEN)make clean$(RESET)     → Remove volumes/images/orphans"
	@echo ""
	@echo "$(BLUE)Development:$(RESET)"
	@echo "  $(GREEN)make dev$(RESET)             → Start dev environment (with logs)"
	@echo "  $(GREEN)make dev-up$(RESET)          → Start dev in background"
	@echo "  $(GREEN)make dev-down$(RESET)        → Stop dev environment"
	@echo "  $(GREEN)make dev-logs$(RESET)        → Show all dev logs"
	@echo "  $(GREEN)make dev-logs-client$(RESET) → Show client logs only"
	@echo "  $(GREEN)make dev-logs-server$(RESET) → Show server logs only"
	@echo "  $(GREEN)make dev-restart$(RESET)     → Restart dev containers"
	@echo "  $(GREEN)make dev-clean$(RESET)       → Clean dev environment"
	@echo ""
