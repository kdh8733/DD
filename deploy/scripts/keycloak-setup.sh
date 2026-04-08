#!/usr/bin/env bash
# ════════════════════════════════════════════
#  Dook-Dak — Keycloak 초기 설정 스크립트
#  사용: bash deploy/scripts/keycloak-setup.sh
# ════════════════════════════════════════════
set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8180}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM="${KEYCLOAK_REALM:-infra-platform}"
CLIENT_ID="${KEYCLOAK_CLIENT_ID:-dookdak-app}"
CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-change-me-in-production}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RESET='\033[0m'

log() { echo -e "${CYAN}▶ $1${RESET}"; }
ok()  { echo -e "${GREEN}✓ $1${RESET}"; }
warn(){ echo -e "${YELLOW}⚠ $1${RESET}"; }

# Keycloak 기동 대기
log "Keycloak 기동 대기 중..."
for i in $(seq 1 30); do
  if curl -sf "${KEYCLOAK_URL}/health/ready" > /dev/null 2>&1; then
    ok "Keycloak 준비됨"
    break
  fi
  echo "  대기 중... (${i}/30)"
  sleep 5
done

# Admin 토큰 발급
log "Admin 토큰 발급..."
TOKEN=$(curl -sf -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=admin-cli" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASS}" \
  -d "grant_type=password" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Admin 토큰 발급 실패. Keycloak 관리자 계정을 확인해주세요."
  exit 1
fi
ok "Admin 토큰 발급 성공"

AUTH_HEADER="Authorization: Bearer ${TOKEN}"
BASE="${KEYCLOAK_URL}/admin/realms"

# 함수: API 호출
kc_post() {
  local path="$1"; shift
  curl -sf -X POST "${BASE}${path}" -H "${AUTH_HEADER}" -H "Content-Type: application/json" "$@" || true
}
kc_get() {
  local path="$1"
  curl -sf -X GET "${BASE}${path}" -H "${AUTH_HEADER}" -H "Content-Type: application/json"
}

# 1. Realm 생성
log "Realm '${REALM}' 생성..."
kc_post "/${KEYCLOAK_URL}/admin/realms" -d "{
  \"realm\": \"${REALM}\",
  \"displayName\": \"Dook-Dak 배포 플랫폼\",
  \"enabled\": true,
  \"registrationAllowed\": false,
  \"loginWithEmailAllowed\": true,
  \"duplicateEmailsAllowed\": false,
  \"accessTokenLifespan\": 1800,
  \"ssoSessionIdleTimeout\": 3600,
  \"ssoSessionMaxLifespan\": 36000
}" 2>/dev/null || warn "Realm이 이미 존재할 수 있습니다 (계속 진행)"

# 이하 /realms/{realm} 베이스 사용
REALM_BASE="${KEYCLOAK_URL}/admin/realms/${REALM}"

# 2. Client 생성
log "Client '${CLIENT_ID}' 생성..."
curl -sf -X POST "${REALM_BASE}/clients" \
  -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"${CLIENT_ID}\",
    \"name\": \"Dook-Dak App\",
    \"enabled\": true,
    \"protocol\": \"openid-connect\",
    \"publicClient\": false,
    \"secret\": \"${CLIENT_SECRET}\",
    \"redirectUris\": [
      \"http://localhost:5173/*\",
      \"http://localhost:3000/*\",
      \"https://dookdak.internal/*\"
    ],
    \"webOrigins\": [\"+\"],
    \"standardFlowEnabled\": true,
    \"implicitFlowEnabled\": false,
    \"directAccessGrantsEnabled\": true,
    \"serviceAccountsEnabled\": true,
    \"authorizationServicesEnabled\": false,
    \"fullScopeAllowed\": true,
    \"attributes\": {
      \"access.token.lifespan\": \"1800\"
    }
  }" 2>/dev/null || warn "Client가 이미 존재할 수 있습니다"
ok "Client 생성됨"

# 3. Groups Mapper 추가 (JWT에 groups 클레임 포함)
log "Groups Mapper 설정..."
CLIENT_UUID=$(curl -sf "${REALM_BASE}/clients?clientId=${CLIENT_ID}" \
  -H "${AUTH_HEADER}" | jq -r '.[0].id')

if [ -n "$CLIENT_UUID" ] && [ "$CLIENT_UUID" != "null" ]; then
  curl -sf -X POST "${REALM_BASE}/clients/${CLIENT_UUID}/protocol-mappers/models" \
    -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
    -d '{
      "name": "groups",
      "protocol": "openid-connect",
      "protocolMapper": "oidc-group-membership-mapper",
      "config": {
        "full.path": "false",
        "id.token.claim": "true",
        "access.token.claim": "true",
        "claim.name": "groups",
        "userinfo.token.claim": "true"
      }
    }' 2>/dev/null || warn "Groups mapper가 이미 존재할 수 있습니다"
  ok "Groups Mapper 설정됨"
fi

# 4. 그룹 생성
log "그룹 생성..."
GROUPS=("infra-admin" "infra-senior" "infra-devops" "developer" "sre-team" "all-employees")
for GROUP in "${GROUPS[@]}"; do
  curl -sf -X POST "${REALM_BASE}/groups" \
    -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
    -d "{\"name\": \"${GROUP}\"}" 2>/dev/null || warn "그룹 '${GROUP}'이 이미 존재합니다"
  echo "  그룹 생성: ${GROUP}"
done
ok "그룹 생성 완료"

# 5. 테스트 사용자 생성
log "테스트 사용자 생성..."

create_user() {
  local username="$1" firstname="$2" lastname="$3" email="$4" password="$5" group="$6"

  # 사용자 생성
  curl -sf -X POST "${REALM_BASE}/users" \
    -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
    -d "{
      \"username\": \"${username}\",
      \"firstName\": \"${firstname}\",
      \"lastName\": \"${lastname}\",
      \"email\": \"${email}\",
      \"enabled\": true,
      \"emailVerified\": true,
      \"credentials\": [{
        \"type\": \"password\",
        \"value\": \"${password}\",
        \"temporary\": false
      }]
    }" 2>/dev/null || warn "사용자 '${username}'이 이미 존재합니다"

  # 그룹에 추가
  USER_ID=$(curl -sf "${REALM_BASE}/users?username=${username}" \
    -H "${AUTH_HEADER}" | jq -r '.[0].id')
  GROUP_ID=$(curl -sf "${REALM_BASE}/groups?search=${group}" \
    -H "${AUTH_HEADER}" | jq -r '.[0].id')

  if [ -n "$USER_ID" ] && [ "$USER_ID" != "null" ] && \
     [ -n "$GROUP_ID" ] && [ "$GROUP_ID" != "null" ]; then
    curl -sf -X PUT "${REALM_BASE}/users/${USER_ID}/groups/${GROUP_ID}" \
      -H "${AUTH_HEADER}" 2>/dev/null || true
  fi
  echo "  사용자: ${username} (${group})"
}

create_user "admin.user"   "Admin"  "User"   "admin@company.com"   "admin123"   "infra-admin"
create_user "senior.sre"   "Senior" "SRE"    "senior@company.com"  "senior123"  "infra-senior"
create_user "devops.user"  "DevOps" "User"   "devops@company.com"  "devops123"  "infra-devops"
create_user "dev.user"     "Dev"    "User"   "dev@company.com"     "dev123"     "developer"
create_user "viewer.user"  "Viewer" "User"   "viewer@company.com"  "viewer123"  "all-employees"

ok "테스트 사용자 생성 완료"

echo ""
echo "════════════════════════════════════════════"
ok "Keycloak 초기 설정 완료!"
echo ""
echo "테스트 계정:"
echo "  admin.user  / admin123   → Platform Admin"
echo "  senior.sre  / senior123  → Senior DevOps"
echo "  devops.user / devops123  → DevOps"
echo "  dev.user    / dev123     → Developer"
echo "  viewer.user / viewer123  → Viewer"
echo ""
echo "Keycloak 관리자 콘솔: ${KEYCLOAK_URL}/admin"
echo "Realm: ${REALM}"
echo "Client ID: ${CLIENT_ID}"
echo "Client Secret: ${CLIENT_SECRET}"
echo "════════════════════════════════════════════"
