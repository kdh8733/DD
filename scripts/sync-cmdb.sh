#!/usr/bin/env bash
# ════════════════════════════════════════════
#  Dook-Dak — CMDB 인벤토리 동기화 스크립트
#  cron: */5 * * * * /opt/dookdak/scripts/sync-cmdb.sh
# ════════════════════════════════════════════
set -euo pipefail

CMDB_API_URL="${CMDB_API_URL:-http://cmdb.internal/api/v1}"
CMDB_API_TOKEN="${CMDB_API_TOKEN:-}"
INVENTORY_DIR="${ANSIBLE_INVENTORY_DIR:-/opt/dookdak/inventory}"
API_URL="${VITE_API_BASE_URL:-http://localhost:8080}"
USE_CACHE_ON_FAILURE="${CMDB_USE_CACHE_ON_FAILURE:-true}"
TIMEOUT="${CMDB_SYNC_TIMEOUT_SECONDS:-60}"
LOG_FILE="/var/log/dookdak/cmdb-sync.log"

# 색상
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
RESET='\033[0m'

# 로그 함수
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}" 2>/dev/null || echo "$1"
}

log "CMDB 동기화 시작..."

mkdir -p "${INVENTORY_DIR}"

# ── 실제 CMDB API 연동 (예시) ──────────────
# 실제 환경에서는 CMDB API를 호출하여 인벤토리 데이터를 가져옵니다.
# 아래는 샘플 데이터를 생성하는 예시입니다.

sync_group() {
  local group_name="$1"
  local platform="$2"
  local environment="$3"
  local dc="$4"
  local hosts_json="$5"

  local output_file="${INVENTORY_DIR}/${group_name}.json"
  local tmp_file="${output_file}.tmp"

  cat > "${tmp_file}" <<EOF
{
  "group": "${group_name}",
  "platform": "${platform}",
  "environment": "${environment}",
  "dc": "${dc}",
  "hosts": ${hosts_json},
  "last_synced": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
}
EOF

  # 변경사항 확인
  if [ -f "${output_file}" ] && diff -q "${tmp_file}" "${output_file}" > /dev/null 2>&1; then
    rm "${tmp_file}"
    log "  ${group_name}: 변경 없음"
  else
    mv "${tmp_file}" "${output_file}"
    log "  ${group_name}: 업데이트됨"
  fi
}

# ── 샘플 인벤토리 데이터 생성 ──────────────
# 실제 환경에서는 CMDB API 응답을 파싱합니다.

if [ -n "${CMDB_API_URL}" ] && [ "${CMDB_API_URL}" != "http://cmdb.internal/api/v1" ]; then
  log "CMDB API 호출: ${CMDB_API_URL}"

  CMDB_RESPONSE=$(curl -sf \
    --max-time "${TIMEOUT}" \
    -H "Authorization: Bearer ${CMDB_API_TOKEN}" \
    -H "Accept: application/json" \
    "${CMDB_API_URL}/inventory/groups" 2>/dev/null) || {
    log "CMDB API 호출 실패"
    if [ "${USE_CACHE_ON_FAILURE}" = "true" ] && [ -d "${INVENTORY_DIR}" ]; then
      log "이전 캐시 유지 (${INVENTORY_DIR})"
      exit 0
    fi
    exit 1
  }

  # API 응답을 파일로 저장 (실제 구현에서 파싱 로직 추가)
  echo "${CMDB_RESPONSE}" | jq -c '.groups[]' | while read -r group; do
    name=$(echo "${group}" | jq -r '.name')
    platform=$(echo "${group}" | jq -r '.platform')
    env=$(echo "${group}" | jq -r '.environment')
    dc=$(echo "${group}" | jq -r '.dc // ""')
    hosts=$(echo "${group}" | jq -c '.hosts')
    sync_group "${name}" "${platform}" "${env}" "${dc}" "${hosts}"
  done

else
  log "샘플 인벤토리 데이터 생성 (개발 환경)..."

  sync_group "k8s-worker-dc1" "k8s" "physical" "DC1" '[
    {"hostname":"k8s-worker01-dc1","ip":"172.30.10.11","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"k8s-worker02-dc1","ip":"172.30.10.12","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"k8s-worker03-dc1","ip":"172.30.10.13","os":"Rocky Linux 9.4","status":"active","last_deployed":null}
  ]'

  sync_group "k8s-worker-dc2" "k8s" "physical" "DC2" '[
    {"hostname":"k8s-worker01-dc2","ip":"172.31.10.11","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"k8s-worker02-dc2","ip":"172.31.10.12","os":"Rocky Linux 9.4","status":"active","last_deployed":null}
  ]'

  sync_group "redis-cluster-dc1" "redis" "openstack" "DC1" '[
    {"hostname":"redis01-dc1","ip":"172.30.20.11","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"redis02-dc1","ip":"172.30.20.12","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"redis03-dc1","ip":"172.30.20.13","os":"Rocky Linux 9.4","status":"active","last_deployed":null}
  ]'

  sync_group "es-data-dc1" "elasticsearch" "esxi" "DC1" '[
    {"hostname":"es-data01-dc1","ip":"172.30.50.11","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"es-data02-dc1","ip":"172.30.50.12","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"es-data03-dc1","ip":"172.30.50.13","os":"Rocky Linux 9.4","status":"active","last_deployed":null}
  ]'

  sync_group "db-mysql-primary" "mysql" "gcp" "" '[
    {"hostname":"db-mysql01-gcp","ip":"10.0.1.11","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"db-mysql02-gcp","ip":"10.0.1.12","os":"Rocky Linux 9.4","status":"active","last_deployed":null}
  ]'

  sync_group "hadoop-datanode-dc1" "hadoop" "physical" "DC1" '[
    {"hostname":"hadoop-dn01-dc1","ip":"172.30.80.11","os":"Rocky Linux 8.9","status":"active","last_deployed":null},
    {"hostname":"hadoop-dn02-dc1","ip":"172.30.80.12","os":"Rocky Linux 8.9","status":"active","last_deployed":null},
    {"hostname":"hadoop-dn03-dc1","ip":"172.30.80.13","os":"Rocky Linux 8.9","status":"active","last_deployed":null}
  ]'

  sync_group "envoy-edge-dc1" "envoy" "openstack" "DC1" '[
    {"hostname":"envoy-edge01-dc1","ip":"172.30.5.21","os":"Rocky Linux 9.4","status":"active","last_deployed":null},
    {"hostname":"envoy-edge02-dc1","ip":"172.30.5.22","os":"Rocky Linux 9.4","status":"active","last_deployed":null}
  ]'

  sync_group "app-server-prod" "os" "aws" "" '[
    {"hostname":"app-server01-aws","ip":"10.0.10.5","os":"Amazon Linux 2023","status":"active","last_deployed":null},
    {"hostname":"app-server02-aws","ip":"10.0.10.6","os":"Amazon Linux 2023","status":"active","last_deployed":null}
  ]'
fi

# 동기화 완료 후 API 서버에 알림 (선택)
if curl -sf "${API_URL}/health" > /dev/null 2>&1; then
  curl -sf -X POST "${API_URL}/api/v1/inventory/sync-complete" \
    -H "Content-Type: application/json" \
    -d "{\"synced_at\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\"}" \
    > /dev/null 2>&1 || true
fi

# 인벤토리 통계 출력
TOTAL_GROUPS=$(ls "${INVENTORY_DIR}"/*.json 2>/dev/null | wc -l)
TOTAL_HOSTS=$(cat "${INVENTORY_DIR}"/*.json 2>/dev/null | jq -r '.hosts | length' | paste -sd+ | bc 2>/dev/null || echo "0")

log "동기화 완료: ${TOTAL_GROUPS}개 그룹, ${TOTAL_HOSTS}개 호스트"
