#!/usr/bin/env bash
# Applies pending drizzle migrations to the deployed RDS instance.
#
# RDS sits in isolated subnets reachable only from the app security group
# (infrastructure/cloudformation/security-groups.yaml), so this opens an SSM
# port-forward tunnel through a running web-platform ECS task (which already
# has EnableExecuteCommand: true) and runs `npm run db:migrate` through it.
#
# Usage: scripts/migrate-rds.sh [env] [local-port]
#   env         dev or prod (default: dev)
#   local-port  local port for the tunnel (default: 15432)
#
# Requires: AWS CLI v2, the Session Manager plugin, Node.js, and an IAM
# principal allowed to call cloudformation:DescribeStacks,
# secretsmanager:GetSecretValue, ecs:ListTasks, ecs:DescribeTasks,
# ecs:ExecuteCommand and ssm:StartSession.
set -euo pipefail

ENV="${1:-dev}"
LOCAL_PORT="${2:-15432}"
REGION="ap-southeast-1"
PROJECT="rescufood"
CLUSTER="${PROJECT}-${ENV}"
DATA_STACK="${PROJECT}-${ENV}-data"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Listings tables live in the profile service's database, not the RDS
# instance's own default database (the data stack's DbName output,
# "rescufood" - used for admin connections like the bootstrap task).
# Migrating against the wrong database fails as soon as a migration
# touches a table it doesn't have, e.g. 0001_cross_service_fks's FK
# constraints on profile's organisations/users tables.
DB_NAME="profile"

echo "==> resolving RDS connection details from ${DATA_STACK}"
OUTPUTS_JSON=$(aws cloudformation describe-stacks --region "$REGION" \
  --stack-name "$DATA_STACK" --query "Stacks[0].Outputs" --output json)
eval "$(node -e '
const outputs = JSON.parse(require("fs").readFileSync(0, "utf8"));
const map = Object.fromEntries(outputs.map(o => [o.OutputKey, o.OutputValue]));
for (const key of ["DbEndpoint", "DbPort", "DbSecretArn"]) {
  if (!map[key]) throw new Error(`missing stack output ${key}`);
  console.log(`${key}=${JSON.stringify(map[key])}`);
}
' <<<"$OUTPUTS_JSON")"

echo "==> fetching master credentials from ${DbSecretArn}"
SECRET_JSON=$(aws secretsmanager get-secret-value --region "$REGION" \
  --secret-id "$DbSecretArn" --query SecretString --output text)
eval "$(node -e '
const s = JSON.parse(require("fs").readFileSync(0, "utf8"));
console.log(`DB_USER=${JSON.stringify(encodeURIComponent(s.username))}`);
console.log(`DB_PASS=${JSON.stringify(encodeURIComponent(s.password))}`);
' <<<"$SECRET_JSON")"

echo "==> finding a running web-platform task in ${CLUSTER}"
TASK_ARN=$(aws ecs list-tasks --region "$REGION" --cluster "$CLUSTER" \
  --service-name web-platform --query "taskArns[0]" --output text)
if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
  echo "no running web-platform task found in cluster ${CLUSTER} - start it before migrating" >&2
  exit 1
fi
TASK_ID="${TASK_ARN##*/}"
RUNTIME_ID=$(aws ecs describe-tasks --region "$REGION" --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" --query "tasks[0].containers[0].runtimeId" --output text)

echo "==> opening ssm tunnel: localhost:${LOCAL_PORT} -> ${DbEndpoint}:${DbPort}"
aws ssm start-session --region "$REGION" \
  --target "ecs:${CLUSTER}_${TASK_ID}_${RUNTIME_ID}" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"${DbEndpoint}\"],\"portNumber\":[\"${DbPort}\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}" \
  >/tmp/migrate-rds-tunnel.log 2>&1 &
TUNNEL_PID=$!
trap 'kill "$TUNNEL_PID" 2>/dev/null || true' EXIT

echo "==> waiting for tunnel to come up"
for _ in $(seq 1 30); do
  if node -e "require('net').connect(${LOCAL_PORT}, 'localhost').on('connect', function () { this.end(); process.exit(0); }).on('error', function () { process.exit(1); })" 2>/dev/null; then
    break
  fi
  sleep 1
done

echo "==> running drizzle-kit migrate against ${ENV} (${DbEndpoint})"
# uselibpqcompat restores the classic libpq meaning of sslmode=require
# (encrypt, don't verify the chain) - newer pg-connection-string otherwise
# treats require as an alias for verify-full, which rejects RDS's cert
# chain since we never bundle AWS's CA bundle into any client here.
#
# CI=true: drizzle-kit's progress spinner assumes a TTY and can swallow
# its own failure output when run through a pipe/log capture instead -
# this makes it print plain lines so a real error is actually visible.
CI=true DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@localhost:${LOCAL_PORT}/${DB_NAME}?sslmode=require&uselibpqcompat=true" \
  npm run --prefix "${SCRIPT_DIR}/.." db:migrate
