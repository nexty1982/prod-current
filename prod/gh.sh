#!/bin/bash

mkdir -p ~/.ssh
chmod 700 ~/.ssh
KEYFILE=~/.ssh/id_ed25519_github_orthodoxmetrics
ssh-keygen -t ed25519 -a 100 -f "$KEYFILE" -C "github-orthodoxmetrics-$(hostname)-$(date +%F)"

eval "$(ssh-agent -s)"
ssh-add "$KEYFILE"

echo "----- COPY FROM HERE -----"
cat "${KEYFILE}.pub"
echo "----- COPY UNTIL HERE ----"

ssh -o StrictHostKeyChecking=accept-new -T git@github.com || true

git remote remove origin 2>/dev/null || true
git remote add origin git@github.com:orthodoxmetrics/current-prod.git

[ -f .husky/pre-commit ] && mv .husky/pre-commit .husky/pre-commit.disabled || true
export HUSKY=0

git config user.name  "Nick"
git config user.email "info@orthodoxmetrics.com"

git add -A
git commit -m "initial import: orthodoxmetrics prod tree (skip hooks)" --no-verify || true

git symbolic-ref HEAD refs/heads/main || true
git push -u origin main

