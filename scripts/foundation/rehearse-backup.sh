#!/usr/bin/env bash
set -euo pipefail

evidence_dir=".foundation-evidence"
dump_file="${evidence_dir}/geoeval.dump"
mkdir -p "${evidence_dir}"

docker compose exec -T postgres pg_dump -U geoeval -d geoeval -Fc > "${dump_file}"
docker compose exec -T postgres dropdb -U geoeval --if-exists geoeval_restore
docker compose exec -T postgres createdb -U geoeval geoeval_restore
docker compose exec -T postgres pg_restore -U geoeval -d geoeval_restore --no-owner < "${dump_file}"

source_count="$(docker compose exec -T postgres psql -U geoeval -d geoeval -Atc 'select count(*) from foundation_records')"
restore_count="$(docker compose exec -T postgres psql -U geoeval -d geoeval_restore -Atc 'select count(*) from foundation_records')"

if [[ "${source_count}" != "${restore_count}" ]]; then
  echo "restore count mismatch: source=${source_count} restored=${restore_count}" >&2
  exit 1
fi

echo "backup_restore_passed source_records=${source_count} restored_records=${restore_count}"
