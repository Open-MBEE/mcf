#!/bin/bash
set -e

cd /opt/mbee
yarn install --offline

exec "$@"
