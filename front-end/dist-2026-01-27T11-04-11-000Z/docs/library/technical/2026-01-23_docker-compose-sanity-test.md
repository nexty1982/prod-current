# Docker Compose Sanity Test

## Purpose

Validate that Docker + Docker Compose work correctly on the server to determine whether Zammad failures are Docker/Compose/runtime issues or Zammad-specific.

## Test Stack

Minimal two-service stack:
- **whoami** (Traefik's whoami) on `127.0.0.1:18080`
- **nginx** (alpine) on `127.0.0.1:18081`

Both services are localhost-bound to avoid public exposure.

## Setup Location

`~/compose_sanity/docker-compose.yml` (or `/opt/compose_sanity/docker-compose.yml` if run as root)

## Current Setup (Step 0)

### Docker/Compose Versions
```bash
docker --version
docker compose version
systemctl is-active docker
```

### Port Conflicts
```bash
ss -lntp | grep -E ':18080|:18081'
```

### Zammad Status
```bash
cd /opt/zammad && docker compose ps
```

## Test Execution

### Step 1: Create Compose File
Created `/opt/compose_sanity/docker-compose.yml` with:
- `traefik/whoami:latest` on port 18080
- `nginx:alpine` on port 18081
- Both bound to `127.0.0.1` only
- No env files, no volumes, no external networks

### Step 2: Bring Up Stack
```bash
cd /opt/compose_sanity
docker compose up -d
```

### Step 3: Verify Containers
```bash
docker compose ps
```

Expected: Both containers show `Up` status.

### Step 4: Verify HTTP
```bash
# Test whoami
curl -sS -D- http://127.0.0.1:18080/ | head -n 20

# Test nginx
curl -I http://127.0.0.1:18081/
```

Expected:
- whoami: Returns HTTP 200 with hostname/headers
- nginx: Returns HTTP 200 with nginx welcome page

## Diagnostics

If services fail:
```bash
docker compose logs --tail=200
docker info | grep -E 'Server Version|Storage Driver|Logging Driver'
```

Common failure causes:
- Image pull failure (network/DNS)
- Port binding failure (port already in use)
- Permission issues (Docker daemon access)
- iptables/firewall blocking
- Storage driver issues

## Cleanup

```bash
cd /opt/compose_sanity
docker compose down
```

**Note:** Leave `/opt/compose_sanity` directory in place for future diagnostics.

## Permission Note

The `next` user does not have Docker socket access. The test must be run as root or a user in the `docker` group.

**To run the test:**
```bash
bash /tmp/run-sanity-test.sh
```

**Or manually:**
```bash
cd /opt/compose_sanity
docker compose up -d
docker compose ps
curl http://127.0.0.1:18080/
curl -I http://127.0.0.1:18081/
```

## Test Results (2026-01-23 12:42 UTC)

### Current Status
- ✅ Docker version: 29.1.5
- ✅ Docker Compose version: v5.0.2
- ✅ Docker daemon: active
- ✅ Test ports (18080, 18081): available
- ✅ **Docker/Compose OK - Both endpoints responding correctly**

### Test Execution
```bash
bash /tmp/run-sanity-test.sh
```

### Results
- ✅ **whoami service**: HTTP 200 OK, responding correctly on port 18080
- ✅ **nginx service**: HTTP 200 OK, responding correctly on port 18081
- ✅ **Containers**: Both containers Up and healthy
- ✅ **Port bindings**: Correctly bound to 127.0.0.1
- ✅ **Docker info**: Server Version 29.1.5, Storage Driver overlayfs, Logging Driver json-file

### Conclusion
**Docker/Compose infrastructure is working correctly.** This confirms that Zammad's issues are **application-specific**, not Docker/Compose/runtime issues.

The Zammad container is still restarting, but this is due to Zammad application configuration (database password, Redis connection, etc.), not Docker/Compose problems.

## Conclusion

After running tests, document:

- ✅ **"Docker/Compose OK"** - if both endpoints respond correctly
- ❌ **"Host-level issue"** - with exact cause if not

This helps isolate whether Zammad issues are:
- Docker/Compose configuration problems
- Zammad-specific application issues
- Network/runtime environment issues
