#!/bin/bash
docker rm --force redis
docker rm --force mongodb
docker network create --attachable=true --driver=bridge mbee
docker volume create mongodb_data

docker run --rm \
  -d --volume mongodb_data:/data/db \
  --name mongodb \
  --network mbee \
  -p 27017:27017 \
  mongo:4.4
docker run --rm \
  -d --name redis \
  --network mbee \
  -p 6379:6379 \
  redis:6.0.9
