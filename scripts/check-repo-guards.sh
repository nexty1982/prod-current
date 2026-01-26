set -Eeuo pipefail
cd "$(git rev-parse --show-toplevel)"

if git ls-files | grep -q '^prod/'; then
  echo "ERROR: Tracked paths under 'prod/' detected. Repo layout is invalid."
  git ls-files | grep '^prod/' | head -n 200
  exit 1
fi

bad_docs="$(git ls-files | grep -E '(^|/)docs/' | grep -vE '^docs/' || true)"
allowed='^(front-end/docs/README\.md|front-end/public/docs/README\.md|server/docs/README\.md)$'
bad_docs="$(echo "${bad_docs}" | grep -Ev "${allowed}" || true)"

if [ -n "${bad_docs}" ]; then
  echo "ERROR: Documentation must live under repo-root /docs only."
  echo "${bad_docs}" | head -n 200
  exit 1
fi
