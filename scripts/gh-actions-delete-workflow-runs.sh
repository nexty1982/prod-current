OWNER=nexty1982
REPO=prod-current

# Safety prompt
read -p "About to DELETE ALL Actions workflow runs in $OWNER/$REPO. Type DELETE to continue: " ok
[ "$ok" = "DELETE" ] || exit 1

page=1
while :; do
  ids=$(gh api -H "Accept: application/vnd.github+json" \
    "/repos/$OWNER/$REPO/actions/runs?per_page=100&page=$page" \
    --jq '.workflow_runs[].id')

  [ -n "$ids" ] || break

  for id in $ids; do
    echo "Deleting run $id"
    gh api -X DELETE -H "Accept: application/vnd.github+json" \
      "/repos/$OWNER/$REPO/actions/runs/$id" >/dev/null
  done

  page=$((page+1))
done

echo "Done."
