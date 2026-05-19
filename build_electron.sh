#!/bin/bash


# rm -rf data/*.sqlite
backuped=false
if [ -f data/database.sqlite ]; then
  sudo mv data/database.sqlite /tmp/database.sqlite.bak || exit 1
  backuped=true
fi

docker run --rm -ti \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|PULL_REQUEST|COMMIT_EMAIL|COMMIT_SHA') \
  -v ${PWD}:/project \
  -w /project \
  docker.io/electronuserland/builder:wine \
  /bin/bash -c "npm install && npm run build:win"

if [ ${backuped} == true ]; then
  sudo mv /tmp/database.sqlite.bak data/database.sqlite
fi