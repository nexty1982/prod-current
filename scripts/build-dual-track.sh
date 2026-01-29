#!/bin/bash
set -e
PROJECT_ROOT="/var/www/orthodoxmetrics/prod"
FRONTEND_DIR="${PROJECT_ROOT}/front-end"

get_branch() { cd "${PROJECT_ROOT}" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"; }
get_commit_hash() { cd "${PROJECT_ROOT}" && git rev-parse --short HEAD 2>/dev/null || echo "unknown"; }

get_target_dir() {
    case "$1" in
        main|master|production) echo "dist-stable" ;;
        *) echo "dist-latest" ;;
    esac
}

generate_build_info() {
    cat > "${FRONTEND_DIR}/$1/build-info.json" << EOF
{"version":"$(date +%Y.%m.%d)","branch":"$2","commit":"$3","buildTime":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","track":"$1"}
EOF
}

main() {
    local branch=$(get_branch)
    local commit=$(get_commit_hash)
    local target=${1:-$(get_target_dir "$branch")}
    
    echo "Building for track: $target (branch: $branch)"
    cd "${FRONTEND_DIR}" && npm run build
    
    mkdir -p "${FRONTEND_DIR}/${target}"
    cp -r "${FRONTEND_DIR}/dist/"* "${FRONTEND_DIR}/${target}/"
    generate_build_info "$target" "$branch" "$commit"
    
    ln -sfn "${FRONTEND_DIR}/${target}" "${FRONTEND_DIR}/dist-active"
    echo "Build complete: $target"
}
main "$@"
