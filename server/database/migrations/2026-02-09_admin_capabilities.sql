-- ============================================================================
-- Admin Capabilities Registry - Database Migration
-- Date: 2026-02-09
-- Purpose: Store inventory of backend capabilities (routes, jobs, settings)
--          so the Admin UI can be built against reality.
-- Database: orthodoxmetrics_db (app DB, NOT auth DB)
-- ============================================================================

USE orthodoxmetrics_db;

-- ============================================================================
-- Admin Capabilities Table
-- Each row represents one discoverable backend feature (route, job, setting).
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_capabilities (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    kind        VARCHAR(32)   NOT NULL DEFAULT 'route' COMMENT 'Capability type: route, job, setting',
    `key`       VARCHAR(255)  NOT NULL UNIQUE COMMENT 'Stable identifier e.g. api.admin.get./api/admin/users',
    name        VARCHAR(255)  NOT NULL COMMENT 'Human-readable label e.g. GET /api/admin/users',
    method      VARCHAR(10)   NULL COMMENT 'HTTP method (routes only)',
    path        VARCHAR(512)  NULL COMMENT 'Route path e.g. /api/admin/users',
    source_file VARCHAR(512)  NULL COMMENT 'Source file where capability is defined',
    roles_json  JSON          NULL COMMENT '["super_admin","admin"] - roles allowed',
    tags_json   JSON          NULL COMMENT '["admin","users"] - classification tags',
    auth        VARCHAR(32)   NULL COMMENT 'Auth type: session, super_admin, none',
    notes       TEXT          NULL COMMENT 'Free-form notes',
    status      ENUM('active','deprecated','disabled') NOT NULL DEFAULT 'active',
    last_seen_at TIMESTAMP    NULL COMMENT 'Last time the inventory script saw this capability',
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_kind (kind),
    INDEX idx_status (status),
    INDEX idx_auth (auth),
    INDEX idx_last_seen (last_seen_at),
    INDEX idx_method_path (method, path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Admin Capability Scan Runs (optional - tracks scan history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_capability_runs (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    started_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at      TIMESTAMP NULL,
    total_found   INT       NOT NULL DEFAULT 0 COMMENT 'Total capabilities discovered',
    upserted      INT       NOT NULL DEFAULT 0 COMMENT 'Rows inserted or updated',
    deprecated    INT       NOT NULL DEFAULT 0 COMMENT 'Rows marked deprecated (missing)',
    errors        INT       NOT NULL DEFAULT 0 COMMENT 'Errors during scan',
    summary_json  JSON      NULL COMMENT 'Detailed scan summary',
    INDEX idx_started (started_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
