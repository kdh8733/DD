# ════════════════════════════════════════════
#  Dook-Dak (뚝딱) — Makefile
# ════════════════════════════════════════════
.PHONY: help dev down api worker fe migrate-up migrate-down \
        build push lint test clean setup logs git-sync git-sync-status

# 기본 목표
.DEFAULT_GOAL := help

# 색상
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

help: ## 사용 가능한 명령어 목록
	@echo ""
	@echo "$(CYAN)Dook-Dak (뚝딱) — 통합 배포 플랫폼$(RESET)"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / \
		{printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

# ── 환경설정 ──────────────────────────────
setup: ## 최초 설정: .env 복사, 의존성 설치
	@echo "$(CYAN)▶ 환경설정 시작...$(RESET)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)✓ .env 파일 생성됨 (값을 설정해주세요)$(RESET)"; \
	else \
		echo "$(YELLOW)ℹ .env 파일이 이미 존재합니다$(RESET)"; \
	fi
	@mkdir -p data/inventory
	@touch data/inventory/.gitkeep
	@echo "$(GREEN)✓ 디렉토리 구조 생성됨$(RESET)"
	@$(MAKE) deps
	@echo "$(GREEN)✓ 설정 완료!$(RESET)"
	@echo ""
	@echo "다음 단계: make dev"

deps: ## 의존성 설치 (Go + npm)
	@echo "$(CYAN)▶ Go 의존성 설치...$(RESET)"
	@cd backend && go mod download
	@echo "$(CYAN)▶ npm 의존성 설치...$(RESET)"
	@cd frontend && npm install

# ── 개발 환경 ─────────────────────────────
dev: ## 전체 개발 스택 실행 (Docker Compose)
	@echo "$(CYAN)▶ 개발 환경 시작...$(RESET)"
	@docker compose -f deploy/docker-compose.yml up -d
	@echo ""
	@echo "$(GREEN)✓ 서비스 시작됨$(RESET)"
	@echo "  Frontend:  http://localhost:5173"
	@echo "  API:       http://localhost:8080"
	@echo "  Keycloak:  http://localhost:8180  (admin/admin)"
	@echo "  DB:        localhost:5432  (dookdak/dookdak_pass)"
	@echo ""

dev-infra: ## 인프라만 실행 (DB + Redis + Keycloak)
	@docker compose -f deploy/docker-compose.yml up -d postgres redis keycloak temporal
	@echo "$(GREEN)✓ 인프라 서비스 시작됨$(RESET)"

down: ## 개발 환경 중지
	@docker compose -f deploy/docker-compose.yml down
	@echo "$(GREEN)✓ 서비스 중지됨$(RESET)"

down-volumes: ## 개발 환경 중지 + 볼륨 삭제 (데이터 초기화)
	@docker compose -f deploy/docker-compose.yml down -v
	@echo "$(YELLOW)⚠ 서비스 중지 및 볼륨 삭제됨 (데이터가 삭제되었습니다)$(RESET)"

# ── 로컬 실행 (Docker 없이) ────────────────
api: ## API 서버 로컬 실행
	@echo "$(CYAN)▶ API 서버 시작 (port: 8080)...$(RESET)"
	@cd backend && go run cmd/api/main.go

worker: ## Ansible Worker 로컬 실행
	@echo "$(CYAN)▶ Ansible Worker 시작...$(RESET)"
	@cd backend && go run cmd/worker/main.go

fe: ## Frontend 개발 서버 로컬 실행
	@echo "$(CYAN)▶ Frontend 개발 서버 시작 (port: 5173)...$(RESET)"
	@cd frontend && npm run dev

# ── 데이터베이스 ──────────────────────────
migrate-up: ## DB 마이그레이션 실행
	@echo "$(CYAN)▶ DB 마이그레이션 실행...$(RESET)"
	@cd backend && go run cmd/migrate/main.go up
	@echo "$(GREEN)✓ 마이그레이션 완료$(RESET)"

migrate-down: ## DB 마이그레이션 롤백 (1단계)
	@echo "$(YELLOW)▶ DB 마이그레이션 롤백...$(RESET)"
	@cd backend && go run cmd/migrate/main.go down
	@echo "$(GREEN)✓ 롤백 완료$(RESET)"

migrate-status: ## 마이그레이션 상태 확인
	@cd backend && go run cmd/migrate/main.go status

migrate-create: ## 새 마이그레이션 파일 생성 (name= 필수)
	@cd backend && go run cmd/migrate/main.go create $(name) sql

# ── Keycloak 설정 ─────────────────────────
keycloak-setup: ## Keycloak realm/client/group 초기 설정
	@echo "$(CYAN)▶ Keycloak 초기 설정...$(RESET)"
	@bash deploy/scripts/keycloak-setup.sh
	@echo "$(GREEN)✓ Keycloak 설정 완료$(RESET)"

# ── 빌드 ──────────────────────────────────
build: ## Docker 이미지 빌드
	@echo "$(CYAN)▶ Docker 이미지 빌드...$(RESET)"
	@docker compose -f deploy/docker-compose.yml build
	@echo "$(GREEN)✓ 빌드 완료$(RESET)"

build-api: ## API 서버 바이너리 빌드
	@echo "$(CYAN)▶ API 서버 빌드...$(RESET)"
	@cd backend && go build -o ./bin/api ./cmd/api/...
	@echo "$(GREEN)✓ backend/bin/api 생성됨$(RESET)"

build-worker: ## Worker 바이너리 빌드
	@echo "$(CYAN)▶ Worker 빌드...$(RESET)"
	@cd backend && go build -o ./bin/worker ./cmd/worker/...
	@echo "$(GREEN)✓ backend/bin/worker 생성됨$(RESET)"

build-fe: ## Frontend 프로덕션 빌드
	@echo "$(CYAN)▶ Frontend 빌드...$(RESET)"
	@cd frontend && npm run build
	@echo "$(GREEN)✓ frontend/dist 생성됨$(RESET)"

# ── 테스트 ─────────────────────────────────
test: ## 전체 테스트 실행
	@$(MAKE) test-api
	@$(MAKE) test-fe

test-api: ## Go 백엔드 테스트
	@echo "$(CYAN)▶ Go 테스트 실행...$(RESET)"
	@cd backend && go test ./... -v -coverprofile=coverage.out
	@cd backend && go tool cover -html=coverage.out -o coverage.html
	@echo "$(GREEN)✓ coverage.html 생성됨$(RESET)"

test-fe: ## Frontend 테스트
	@echo "$(CYAN)▶ Frontend 테스트 실행...$(RESET)"
	@cd frontend && npm run test 2>/dev/null || echo "$(YELLOW)ℹ 테스트 미구성$(RESET)"

# ── 린트 ──────────────────────────────────
lint: ## 코드 린트 실행
	@$(MAKE) lint-api
	@$(MAKE) lint-fe

lint-api: ## Go 린트
	@echo "$(CYAN)▶ Go 린트...$(RESET)"
	@cd backend && go vet ./...
	@which golangci-lint > /dev/null 2>&1 && \
		cd backend && golangci-lint run || \
		echo "$(YELLOW)ℹ golangci-lint 미설치 (go vet만 실행됨)$(RESET)"

lint-fe: ## Frontend 린트
	@echo "$(CYAN)▶ Frontend 린트...$(RESET)"
	@cd frontend && npm run lint 2>/dev/null || echo "$(YELLOW)ℹ 린트 미구성$(RESET)"

# ── 로그 ──────────────────────────────────
logs: ## 전체 서비스 로그 출력
	@docker compose -f deploy/docker-compose.yml logs -f

logs-api: ## API 서버 로그
	@docker compose -f deploy/docker-compose.yml logs -f api

logs-worker: ## Worker 로그
	@docker compose -f deploy/docker-compose.yml logs -f worker

logs-db: ## PostgreSQL 로그
	@docker compose -f deploy/docker-compose.yml logs -f postgres

# ── CMDB 동기화 ───────────────────────────
sync-cmdb: ## CMDB 수동 동기화 실행
	@echo "$(CYAN)▶ CMDB 동기화 실행...$(RESET)"
	@bash scripts/sync-cmdb.sh
	@echo "$(GREEN)✓ 동기화 완료$(RESET)"

# ── GitHub Ansible Repo 동기화 ─────────────
git-sync: ## GitHub Ansible repo 수동 동기화 (API 트리거)
	@echo "$(CYAN)▶ GitHub Ansible repo 동기화 요청...$(RESET)"
	@curl -sf -X POST http://localhost:8080/api/v1/git-sync/trigger \
		-H "Authorization: Bearer $${DOOKDAK_TOKEN}" | jq . || \
		echo "$(YELLOW)⚠ API 서버가 실행 중이어야 합니다 (make api)$(RESET)"

git-sync-status: ## GitHub 동기화 상태 확인
	@curl -sf http://localhost:8080/api/v1/git-sync/status \
		-H "Authorization: Bearer $${DOOKDAK_TOKEN}" | jq . || \
		echo "$(YELLOW)⚠ API 서버가 실행 중이어야 합니다 (make api)$(RESET)"

# ── Kubernetes ─────────────────────────────
k8s-apply: ## Kubernetes 매니페스트 적용
	@echo "$(CYAN)▶ K8s 리소스 생성/업데이트...$(RESET)"
	@kubectl apply -f deploy/k8s/
	@echo "$(GREEN)✓ K8s 배포 완료$(RESET)"

k8s-delete: ## Kubernetes 리소스 삭제
	@echo "$(YELLOW)⚠ K8s 리소스 삭제...$(RESET)"
	@kubectl delete -f deploy/k8s/

k8s-scale-worker: ## Worker Pod 스케일 조정 (replicas= 필수)
	@kubectl scale deployment dookdak-worker --replicas=$(replicas) -n dookdak

# ── 정리 ──────────────────────────────────
clean: ## 빌드 아티팩트 정리
	@echo "$(CYAN)▶ 정리 중...$(RESET)"
	@rm -rf backend/bin/ frontend/dist/ backend/coverage.*
	@echo "$(GREEN)✓ 정리 완료$(RESET)"

# ── 상태 확인 ─────────────────────────────
status: ## 서비스 상태 확인
	@docker compose -f deploy/docker-compose.yml ps

health: ## 헬스체크 (API 서버)
	@curl -sf http://localhost:8080/health | python3 -m json.tool || \
		echo "$(YELLOW)API 서버에 연결할 수 없습니다$(RESET)"
