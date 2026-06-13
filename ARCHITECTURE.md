# Dook-Dak — 아키텍처 및 구축 가이드

> Ansible 기반 통합 배포 플랫폼 · "뚝딱" 업무를 해치우는 DD · Cloud-Native & On-prem 지원 · Scale-out 가능한 Control Plane 구조

---

## 1. 시스템 개요

AWX의 불편한 UX를 대체하여 대규모 인프라(Physical DC, OpenStack, ESXi, AWS, GCP, Azure)를 **단일 셀프서비스 플랫폼**으로 통합 관리하는 배포 시스템.

- 목표: 10,000+ hosts에 빠르고 안정적인 배포
- 사용자: DevOps, SRE, Developer, SE 등 전사 인원
- 인증: Keycloak SSO (OIDC/SAML 2.0)
- 인가: RBAC (역할 기반 접근 제어)

---

## 2. Tech Stack

### Frontend
| 항목 | 선택 | 이유 |
|------|------|------|
| Framework | **React 18 + TypeScript** | 생태계, 타입 안정성, 팀 친숙도 |
| Build Tool | **Vite** | 빠른 HMR, 번들 최적화 |
| Server State | **TanStack Query v5** | 캐싱/재검증/실시간 polling |
| Client State | **Zustand** | 경량, 단순한 전역 상태 |
| UI Components | **Radix UI + Tailwind CSS** | 접근성 + 유연한 스타일링 |
| Realtime Logs | **WebSocket (native)** | 배포 로그 실시간 스트리밍 |
| Charts | **Recharts** | 경량 React-native 차트 |
| 빌드 최적화 | Code Splitting + lazy() | 페이지별 번들 분리 |

### Backend
| 항목 | 선택 | 이유 |
|------|------|------|
| Language | **Go (Golang)** | 고성능, 저메모리, 빠른 응답 |
| Framework | **Echo v4** | 경량 HTTP 프레임워크 |
| ORM | **sqlc + pgx** | 타입 안전 SQL, PostgreSQL 네이티브 |
| Task Queue | **Asynq (Redis 기반)** | Ansible Job 비동기 처리 |
| Workflow Engine | **Temporal** | 복잡한 배포 파이프라인 오케스트레이션 |
| WebSocket | **gorilla/websocket** | 로그 스트리밍 |
| Auth | **Keycloak OIDC** | JWT 검증, 그룹 클레임 기반 RBAC |
| API Spec | **OpenAPI 3.0 (swaggo)** | 자동 문서 생성 |

### Infrastructure
| 항목 | 선택 | 이유 |
|------|------|------|
| Database | **PostgreSQL 16** | Job 이력, RBAC, 설정 메타데이터 |
| Cache/Queue | **Redis 7** | Asynq 큐, 세션 캐시, Pub/Sub |
| Ansible Runner | **ansible-runner** | 프로세스 격리, 결과 파싱 |
| 인증 | **Keycloak 24** | SSO, RBAC 그룹 매핑 |
| 배포 | **Kubernetes (권장)** | Worker Scale-out, HA |
| 개발 환경 | **Docker Compose** | 로컬 개발 환경 원스텝 셋업 |
| 인벤토리 캐시 | **Static JSON 파일** | CMDB 동기화 후 파일 캐싱, 고속 조회 |
| 모니터링 | **Prometheus + Grafana** | Worker 메트릭, Job 통계 |

---

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│           TanStack Query / WebSocket / Zustand                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / WSS
┌────────────────────────▼────────────────────────────────────────┐
│               Backend API (Go + Echo)  ×N (Stateless)           │
│  - REST API (Jobs, Inventory, Playbooks, RBAC, Approval)        │
│  - WebSocket Hub (로그 스트리밍)                                  │
│  - Keycloak JWT 검증 미들웨어                                     │
│  - Temporal Client (워크플로우 트리거)                             │
└──────┬────────────────┬────────────────┬────────────────────────┘
       │                │                │
       ▼                ▼                ▼
┌──────────┐   ┌──────────────┐  ┌──────────────┐
│PostgreSQL│   │  Redis 7     │  │  Temporal    │
│(메타DB)  │   │  (Asynq 큐)  │  │  (워크플로우) │
│Job이력   │   │  세션 캐시   │  │  오케스트레이터│
│RBAC      │   │  Pub/Sub     │  └──────────────┘
│설정      │   │  Job 상태    │
└──────────┘   └──────┬───────┘
                       │ 큐에서 Job 수신
       ┌───────────────┴──────────────────────┐
       │        Ansible Worker Pool           │
       │                                      │
       │  ┌─────────────┐  ┌─────────────┐   │
       │  │ Worker-01   │  │ Worker-02   │   │
       │  │ansible-runner│  │ansible-runner│  │
       │  └──────┬──────┘  └──────┬──────┘   │
       │         │ ...             │ ...      │
       │  ┌─────────────┐  ┌─────────────┐   │
       │  │ Worker-03   │  │ Worker-04   │   │
       │  └─────────────┘  └─────────────┘   │
       └──────────────────────────────────────┘
                         │ SSH / WinRM
       ┌─────────────────▼──────────────────────────┐
       │           Target Infrastructure              │
       │  Physical DC1/DC2 · OpenStack · ESXi        │
       │  AWS (ap-northeast-2, us-east-1)            │
       │  GCP (asia-northeast3) · Azure              │
       └────────────────────────────────────────────┘

       ┌─────────────────────────────────────────────┐
       │                외부 연동                      │
       │  Keycloak (SSO) · GitHub (Webhook/PR)       │
       │  Slack (알림) · PagerDuty (에스컬레이션)     │
       │  CMDB (인벤토리 동기화)                       │
       └─────────────────────────────────────────────┘
```

---

## 4. 컴포넌트 상세

### 4.1 Frontend (React)

```
src/
├── pages/
│   ├── Dashboard/
│   ├── Deploy/
│   ├── History/
│   ├── Approval/
│   ├── Workflow/
│   ├── SelfService/
│   ├── Inventory/
│   ├── Playbooks/
│   ├── Workers/
│   ├── Alerts/
│   ├── RBAC/
│   └── Settings/
├── components/
│   ├── LogViewer/          # WebSocket 기반 실시간 로그
│   ├── WorkflowPipeline/   # 파이프라인 시각화
│   ├── InventoryTable/     # 가상화 테이블 (react-virtual)
│   └── StatusBadge/
├── hooks/
│   ├── useJobLogs.ts       # WebSocket 로그 스트리밍
│   ├── useJobStatus.ts     # Polling (2초 간격)
│   └── useInventory.ts     # 정적 JSON 조회
├── stores/
│   └── authStore.ts        # Keycloak 토큰, 사용자 정보
└── api/
    └── client.ts           # Axios + JWT 자동 첨부
```

**성능 최적화:**
- `react-virtual` — 10,000+ 서버 목록 가상 스크롤
- `useMemo` / `useCallback` — 필터 연산 메모이제이션
- Lazy loading — 페이지별 코드 분할
- TanStack Query staleTime — 인벤토리 5분 캐시

### 4.2 Backend API (Go)

```
internal/
├── api/
│   ├── handler/
│   │   ├── job.go          # 배포 실행, 중단, 재실행
│   │   ├── approval.go     # 승인/거절 처리
│   │   ├── workflow.go     # 워크플로우 CRUD
│   │   ├── inventory.go    # 인벤토리 조회 (JSON 캐시)
│   │   ├── playbook.go     # 플레이북 목록/상세
│   │   ├── worker.go       # Worker 상태 조회
│   │   ├── alert.go        # 알림 조회/처리
│   │   └── rbac.go         # 권한 관리 (Admin only)
│   ├── middleware/
│   │   ├── auth.go         # Keycloak JWT 검증
│   │   ├── rbac.go         # 역할 기반 접근 제어
│   │   └── ratelimit.go    # API Rate Limiting
│   └── ws/
│       └── log_hub.go      # WebSocket 로그 허브
├── worker/
│   ├── runner.go           # ansible-runner 래퍼
│   ├── queue.go            # Asynq 큐 Worker
│   └── log_streamer.go     # 로그 → Redis Pub/Sub → WS
├── repository/
│   ├── job.go
│   ├── approval.go
│   └── inventory.go
└── temporal/
    └── workflows/
        ├── deploy_workflow.go      # 단순 배포 파이프라인
        ├── canary_workflow.go      # DC1→DC2 순차 배포
        └── platform_workflow.go   # 플랫폼별 특화 파이프라인
```

### 4.3 Ansible Worker

각 Worker는 독립적인 프로세스로 동작:

```
1. Redis Asynq 큐에서 Job 수신 (FIFO + 우선순위)
2. ansible-runner로 플레이북 실행
   - 작업 디렉토리: /tmp/jobs/{job_id}/
   - inventory 파일: /data/inventory/{group}.json
   - playbook: /opt/playbooks/{playbook}.yml
3. 실시간 로그를 Redis Pub/Sub에 publish
4. 실행 완료 후 결과(성공/실패/호스트 목록)를 PostgreSQL에 저장
5. 슬랙/PagerDuty 알림 발송
```

### 4.4 인벤토리 (Static JSON 캐시)

```json
// /data/inventory/k8s-worker-dc1.json
{
  "group": "k8s-worker-dc1",
  "platform": "k8s",
  "environment": "physical",
  "dc": "DC1",
  "hosts": [
    {
      "hostname": "k8s-worker01-dc1",
      "ip": "172.30.10.11",
      "os": "Rocky Linux 9.4",
      "status": "active",
      "last_deployed": "2026-04-09T15:04:00Z"
    }
  ],
  "last_synced": "2026-04-09T15:20:00Z"
}
```

CMDB 동기화 주기: 5분 (cron job). 동기화 실패 시 이전 캐시 유지.

---

## 5. 데이터베이스 스키마 (주요 테이블)

```sql
-- 배포 Job
CREATE TABLE jobs (
  id          BIGSERIAL PRIMARY KEY,
  playbook    VARCHAR(200) NOT NULL,
  platform    VARCHAR(50),
  environment VARCHAR(50),
  target_group VARCHAR(200),
  target_hosts JSONB,
  extra_vars  JSONB,
  forks       INT DEFAULT 50,
  status      VARCHAR(20) DEFAULT 'queued', -- queued/running/success/failed/cancelled
  triggered_by VARCHAR(100),
  worker_id   VARCHAR(50),
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 실행 결과 (호스트별)
CREATE TABLE job_results (
  id         BIGSERIAL PRIMARY KEY,
  job_id     BIGINT REFERENCES jobs(id),
  hostname   VARCHAR(200),
  status     VARCHAR(20), -- ok/changed/failed/skipped/unreachable
  task       VARCHAR(500),
  message    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 승인 요청
CREATE TABLE approvals (
  id          BIGSERIAL PRIMARY KEY,
  job_id      BIGINT REFERENCES jobs(id),
  requested_by VARCHAR(100),
  approved_by  VARCHAR(100),
  status       VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected
  comment      TEXT,
  diff_preview TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

-- 워크플로우
CREATE TABLE workflows (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(200),
  definition  JSONB,   -- 파이프라인 스텝 정의
  status      VARCHAR(20),
  triggered_by VARCHAR(100),
  temporal_id  VARCHAR(200),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RBAC 역할
CREATE TABLE roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  description TEXT
);

-- 플레이북별 역할 권한
CREATE TABLE playbook_permissions (
  playbook    VARCHAR(200),
  role_id     INT REFERENCES roles(id),
  can_execute BOOLEAN DEFAULT false,
  can_view    BOOLEAN DEFAULT true,
  require_approval VARCHAR(50), -- none/senior/admin
  PRIMARY KEY (playbook, role_id)
);
```

---

## 6. 디렉토리 구조

```
dookdak/
├── frontend/                   # React + TypeScript
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                    # Go
│   ├── cmd/
│   │   ├── api/main.go         # API 서버 진입점
│   │   └── worker/main.go      # Ansible Worker 진입점
│   ├── internal/
│   ├── migrations/             # DB 마이그레이션 (goose)
│   ├── go.mod
│   └── Dockerfile
│
├── ansible/                    # Ansible 플레이북
│   ├── playbooks/
│   │   ├── k8s.yml
│   │   ├── redis.yml
│   │   ├── elasticsearch.yml
│   │   ├── mysql.yml
│   │   ├── postgresql.yml
│   │   ├── impala.yml
│   │   ├── hadoop.yml
│   │   ├── envoy.yml
│   │   ├── post-bootstrap.yml
│   │   ├── file-serving.yml
│   │   └── settings-conf.yml
│   ├── roles/
│   └── ansible.cfg
│
├── data/
│   └── inventory/              # CMDB 동기화 Static JSON
│       ├── k8s-worker-dc1.json
│       ├── redis-cluster-dc1.json
│       └── ...
│
├── deploy/
│   ├── docker-compose.yml      # 개발 환경
│   ├── docker-compose.prod.yml # 운영 환경
│   └── k8s/                    # Kubernetes 매니페스트
│       ├── api-deployment.yaml
│       ├── worker-deployment.yaml
│       ├── redis.yaml
│       ├── postgres.yaml
│       └── keycloak.yaml
│
└── docs/
    └── ARCHITECTURE.md         # 이 문서
```

---

## 7. 구축 가이드

### 7.1 로컬 개발 환경 (Docker Compose)

**사전 요구사항:**
- Docker Desktop 4.x+
- Go 1.22+
- Node.js 20+

```bash
# 1. 저장소 클론
git clone https://github.com/your-org/dookdak.git
cd dookdak

# 2. 인프라 서비스 실행 (PostgreSQL, Redis, Keycloak)
docker compose up -d postgres redis keycloak

# 3. DB 마이그레이션
cd backend
go run cmd/migrate/main.go up

# 4. Backend API 실행
go run cmd/api/main.go

# 5. Ansible Worker 실행 (별도 터미널)
go run cmd/worker/main.go

# 6. Frontend 실행 (별도 터미널)
cd frontend
npm install
npm run dev
```

**접속:**
- Frontend: http://localhost:5173
- API: http://localhost:8080
- Keycloak 관리자: http://localhost:8180 (admin/admin)

### 7.2 Keycloak 초기 설정

```bash
# Keycloak Realm 생성 (스크립트 제공)
./deploy/scripts/keycloak-setup.sh

# 또는 수동으로:
# 1. Realm: infra-platform 생성
# 2. Client: dookdak-app 생성 (OIDC, Confidential)
# 3. 그룹 생성: infra-admin, infra-senior, infra-devops, developer
# 4. Groups Claim → JWT에 포함 설정
# 5. 테스트 계정 생성 및 그룹 할당
```

**환경 변수 설정 (`backend/.env`):**
```env
DATABASE_URL=postgres://dookdak:password@localhost:5432/dookdak
REDIS_URL=redis://localhost:6379
KEYCLOAK_URL=http://localhost:8180
KEYCLOAK_REALM=infra-platform
KEYCLOAK_CLIENT_ID=dookdak-app
KEYCLOAK_CLIENT_SECRET=your-secret
ANSIBLE_PLAYBOOK_DIR=/opt/playbooks
INVENTORY_DIR=/data/inventory
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
TEMPORAL_ADDRESS=localhost:7233
```

### 7.3 운영 환경 배포 (Kubernetes)

```bash
# Namespace 생성
kubectl create namespace dookdak

# Secret 설정
kubectl create secret generic dookdak-secrets \
  --from-literal=DATABASE_URL="..." \
  --from-literal=REDIS_URL="..." \
  --from-literal=KEYCLOAK_CLIENT_SECRET="..." \
  -n dookdak

# 전체 배포
kubectl apply -f deploy/k8s/ -n dookdak

# Worker Scale-out
kubectl scale deployment ansible-worker --replicas=8 -n dookdak
```

**Kubernetes 리소스 구성:**
```yaml
# API Server: 2~4 replicas (HPA 연동)
# Ansible Worker: 4~16 replicas (큐 깊이 기반 HPA)
# PostgreSQL: StatefulSet (운영: RDS/Cloud SQL 권장)
# Redis: StatefulSet (운영: ElastiCache/Memorystore 권장)
# Keycloak: 2 replicas (외부 DB 연동)
```

### 7.4 Ansible Worker Scale-out 원리

```
                    Redis Queue (Asynq)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Worker Pod 1   Worker Pod 2   Worker Pod 3
     (최대 5 Job)   (최대 5 Job)   (최대 5 Job)
```

- 각 Worker는 Redis 큐에서 독립적으로 Job을 가져감
- Pod 수만 늘리면 자동으로 처리량 증가
- Job 결과는 PostgreSQL에 기록 (중복 없음)
- 로그 스트리밍: Worker → Redis Pub/Sub → API WS → 브라우저

**Worker 스케일링 (on-prem 기준):** 기본은 고정 replicas, 부하 증가 시 HPA(CPU)로 자동 확장한다. 큐 깊이 기반 이벤트 오토스케일(KEDA 등)은 도입하지 않으며, replicas 조정 / HPA로 충분하다.
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ansible-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ansible-worker
  minReplicas: 2
  maxReplicas: 16
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # CPU 70% 초과 시 확장
```

---

## 8. CMDB 인벤토리 동기화

```bash
# CMDB 동기화 스크립트 (5분마다 cron)
*/5 * * * * /opt/dookdak/scripts/sync-cmdb.sh

# sync-cmdb.sh 동작:
# 1. CMDB API 조회 (또는 DB 직접 조회)
# 2. /data/inventory/{group}.json 파일 갱신
# 3. 변경된 파일만 업데이트 (diff 비교)
# 4. 동기화 결과를 PostgreSQL에 기록
# 5. 변경 사항 있으면 Slack 알림
```

**Static JSON의 장점:**
- API 서버 없이 파일 읽기 → 초고속 조회 (µs 단위)
- CMDB 장애 시에도 마지막 동기화 데이터로 운영 가능
- Git으로 버전 관리 가능

---

## 9. 고가용성 (HA) 구성

| 컴포넌트 | HA 방식 | 비고 |
|---------|---------|------|
| API Server | 다중 Pod + LB | Stateless, 수평 확장 |
| Ansible Worker | 다중 Pod (큐 공유) | Stateless, replicas 조정 / HPA |
| PostgreSQL | Primary + Replica | 장애 시 Failover |
| Redis | Sentinel or Cluster | Asynq는 Sentinel 지원 |
| Keycloak | Active-Active (DB 공유) | 세션 공유 필요 |
| Control Plane Node | Primary + Standby | VIP 기반 Failover |

---

## 10. 보안 고려사항

```
1. 네트워크
   - API 서버: HTTPS only (TLS 1.2+)
   - Worker → Target: SSH 키 인증 (비밀번호 금지)
   - SSH 키: Vault (HashiCorp) 또는 K8s Secret 관리

2. 인증/인가
   - 모든 API: Keycloak JWT 필수
   - RBAC: 플레이북별 역할 권한 강제
   - 중요 작업: 승인 프로세스 필수

3. 감사 로그
   - 모든 Job 실행 이력 PostgreSQL 저장
   - 승인/거절 이력 포함
   - 90일 보존 (정책에 따라 조정)

4. Ansible 보안
   - ansible-runner로 프로세스 격리
   - Extra vars sanitization (인젝션 방지)
   - Playbook Git 서명 검증 (선택)

5. Secret 관리
   - DB/Redis/Slack 자격증명: K8s Secret + Vault
   - SSH 키: 정기 교체 (90일)
```

---

## 11. 모니터링 & 관찰성

```
Prometheus Metrics (Backend가 /metrics 노출):
- dookdak_jobs_total{status="success|failed"}
- dookdak_job_duration_seconds{playbook, platform}
- dookdak_queue_depth
- dookdak_worker_active_jobs{worker_id}
- dookdak_approval_wait_duration_seconds

Grafana 대시보드:
- 배포 성공/실패율 (시계열)
- Worker별 부하 분포
- 플레이북별 MTTR
- 환경별 배포 빈도 히트맵

Alert Rules (Prometheus):
- job_failure_rate > 0.1  → Slack
- queue_depth > 50        → Slack
- worker_cpu > 0.8        → PagerDuty
- approval_wait > 3600    → Slack DM
```

---

## 12. 개발 로드맵

### Phase 1 — MVP (현재 HTML 프로토타입 기반)
- [ ] 기본 배포 실행 (Job 큐 → ansible-runner)
- [ ] 실행 이력 조회
- [ ] Keycloak SSO 연동
- [ ] Slack 알림

### Phase 2 — Core
- [ ] 승인 워크플로우 (Temporal)
- [ ] DC1→DC2 순차 배포
- [ ] RBAC 구현
- [ ] CMDB 동기화 + Static JSON

### Phase 3 — Self-Service & Scale
- [ ] 셀프서비스 카탈로그
- [ ] Worker Scale-out (HPA / replicas 조정)
- [ ] 알림 센터 + PagerDuty 연동
- [ ] Dry-run 시각화

### Phase 4 — Enterprise
- [ ] GitOps 자동화 (PR Merge → 자동 배포)
- [ ] 배포 실패 자동 롤백
- [ ] MTTR 대시보드 / SLO 추적
- [ ] 멀티 Keycloak Realm 지원
