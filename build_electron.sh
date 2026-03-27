#!/bin/bash

rm -rf data/*.sqlite
docker run --rm -ti \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|PULL_REQUEST|COMMIT_EMAIL|COMMIT_SHA') \
  -v ${PWD}:/project \
  -w /project \
  docker.io/electronuserland/builder:wine \
  /bin/bash -c "npm install && npm run build:win"