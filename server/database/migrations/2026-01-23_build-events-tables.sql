-- ============================================================================
-- Build Events System - Database Migration
-- Date: 2026-01-23
-- Purpose: Track build lifecycle events and status
-- Database: orthodoxmetrics_db (app DB, NOT auth DB)
-- ============================================================================

USE orthodoxmetrics_db;

-- ============================================================================
-- Build Runs Table
-- Tracks each build execution
-- ============================================================================
CREATE TABLE IF NOT EXISTS build_runs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_id VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID for this build run',
    env ENUM('prod', 'staging', 'dev') NOT NULL COMMENT 'Environment',
    origin ENUM('server', 'frontend', 'root-harness') NOT NULL COMMENT 'Build origin',
    command VARCHAR(255) NOT NULL COMMENT 'Command that triggered build',
    host VARCHAR(255) NOT NULL COMMENT 'Hostname where build ran',
    pid INT COMMENT 'Process ID of build process',
    status ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    last_heartbeat_at TIMESTAMP NULL COMMENT 'Last heartbeat timestamp',
    meta_json JSON COMMENT 'Additional metadata (branch, commit, etc.)',
    INDEX idx_run_id (run_id),
    INDEX idx_status_heartbeat (status, last_heartbeat_at),
    INDEX idx_started_at (started_at DESC),
    INDEX idx_env_origin (env, origin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Build Run Events Table
-- Tracks individual events within a build run
-- ============================================================================
CREATE TABLE IF NOT EXISTS build_run_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_id VARCHAR(36) NOT NULL COMMENT 'FK to build_runs.run_id',
    event ENUM('build_started', 'stage_started', 'stage_completed', 'build_completed', 'build_failed', 'heartbeat') NOT NULL,
    stage VARCHAR(100) NULL COMMENT 'Stage name (e.g., "Backend Clean", "Frontend Build")',
    message TEXT NULL COMMENT 'Event message',
    duration_ms INT NULL COMMENT 'Duration in milliseconds (for stage_completed)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload_json JSON COMMENT 'Additional event payload',
    INDEX idx_run_id (run_id),
    INDEX idx_event_created (event, created_at),
    INDEX idx_run_event (run_id, event),
    FOREIGN KEY (run_id) REFERENCES build_runs(run_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Notification Type for Build Events
-- ============================================================================
INSERT IGNORE INTO notification_types (name, description, category, default_enabled) VALUES
('build_started', 'Build process started', 'system', TRUE),
('build_completed', 'Build process completed successfully', 'system', TRUE),
('build_failed', 'Build process failed', 'system', TRUE);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_build_runs_status_heartbeat ON build_runs(status, last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_build_run_events_run_created ON build_run_events(run_id, created_at DESC);
