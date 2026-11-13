#!/bin/sh
# Run from a trusted operations host with libpq PG* environment variables already set.
# Credentials are read directly by libpq and never interpolated into arguments or logs.
set -eu
umask 077
backup_dir=${BACKUP_DIR:-./backups}
mkdir -p "$backup_dir"
backup_file="$backup_dir/tenue-pro-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --format=custom --no-owner --no-acl --file="$backup_file"
find "$backup_dir" -type f -name 'tenue-pro-*.dump' -mtime +30 -delete
