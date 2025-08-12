-- =====================================================
-- OrthodoxMetrics Comprehensive JSON-to-Database Migration
-- Migrates all JSON/file-based systems to database tables
-- =====================================================

-- 1. OMAI Commands (omai-commands.json → omai_commands)
-- AI action definitions, triggers, and structured payloads
CREATE TABLE IF NOT EXISTS omai_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    command_key VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    patterns JSON NOT NULL,
    description TEXT,
    action VARCHAR(100) NOT NULL,
    safety ENUM('safe', 'moderate', 'dangerous') DEFAULT 'safe',
    context_aware BOOLEAN DEFAULT FALSE,
    requires_hands_on BOOLEAN DEFAULT FALSE,
    requires_confirmation BOOLEAN DEFAULT FALSE,
    requires_parameters JSON DEFAULT NULL,
    allowed_roles JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_category (category),
    INDEX idx_safety (safety),
    INDEX idx_active (is_active)
);

CREATE TABLE IF NOT EXISTS omai_command_contexts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_path VARCHAR(255) NOT NULL,
    suggested_commands JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_page_path (page_path)
);

-- 2. Component Registry (auto-discovered-components.json → component_registry)
-- Components auto-detected in codebase
CREATE TABLE IF NOT EXISTS component_registry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    directory VARCHAR(500),
    extension VARCHAR(10),
    category VARCHAR(50),
    props JSON DEFAULT NULL,
    imports JSON DEFAULT NULL,
    exports JSON DEFAULT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    has_jsx BOOLEAN DEFAULT FALSE,
    has_hooks BOOLEAN DEFAULT FALSE,
    dependencies JSON DEFAULT NULL,
    file_size INT DEFAULT 0,
    lines_of_code INT DEFAULT 0,
    complexity_score INT DEFAULT 0,
    last_modified TIMESTAMP NULL,
    discovery_version VARCHAR(20) DEFAULT '1.0.0',
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_directory (directory(255)),
    INDEX idx_active (is_active),
    FULLTEXT idx_search (name, relative_path, directory)
);

-- 3. Build Configuration (paths.config.example, build.config.json → build_paths)
-- File and deployment paths
CREATE TABLE IF NOT EXISTS build_paths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    environment ENUM('development', 'staging', 'production', 'docker') DEFAULT 'production',
    project_root TEXT NOT NULL,
    frontend_path TEXT NOT NULL,
    log_path TEXT DEFAULT NULL,
    upload_path TEXT DEFAULT NULL,
    backup_path TEXT DEFAULT NULL,
    custom_paths JSON DEFAULT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_environment (environment),
    INDEX idx_active (is_active)
);

CREATE TABLE IF NOT EXISTS build_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL DEFAULT 'default',
    mode ENUM('full', 'incremental') DEFAULT 'full',
    memory_mb INT DEFAULT 4096,
    install_package VARCHAR(255) DEFAULT '',
    legacy_peer_deps BOOLEAN DEFAULT TRUE,
    skip_install BOOLEAN DEFAULT FALSE,
    dry_run BOOLEAN DEFAULT FALSE,
    additional_flags JSON DEFAULT NULL,
    environment VARCHAR(50) DEFAULT 'production',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE KEY unique_config_env (config_name, environment),
    INDEX idx_environment (environment),
    INDEX idx_active (is_active)
);

-- 4. OMAI Policies (omai_security_policy.json → omai_policies)
-- Security rules, agent permissions
CREATE TABLE IF NOT EXISTS omai_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    policy_name VARCHAR(100) NOT NULL UNIQUE,
    policy_type ENUM('security', 'access', 'command', 'user') DEFAULT 'security',
    allowed_users JSON DEFAULT NULL,
    blocked_commands JSON DEFAULT NULL,
    require_confirmation JSON DEFAULT NULL,
    allowed_roles JSON DEFAULT NULL,
    max_command_length INT DEFAULT 1000,
    timeout_seconds INT DEFAULT 300,
    log_all_commands BOOLEAN DEFAULT TRUE,
    policy_rules JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_policy_type (policy_type),
    INDEX idx_active (is_active)
);

-- 5. Parish Map Data (parish-map.tsx, sample-parish-map/ → parish_map_data)
-- Geospatial data, GeoJSON or marker structures
CREATE TABLE IF NOT EXISTS parish_map_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parish_name VARCHAR(255) NOT NULL,
    location_type ENUM('church', 'monastery', 'shrine', 'cemetery', 'community') DEFAULT 'church',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(100) DEFAULT 'USA',
    zip_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    denomination VARCHAR(100),
    language VARCHAR(50) DEFAULT 'English',
    services_schedule JSON DEFAULT NULL,
    geojson_data JSON DEFAULT NULL,
    marker_style JSON DEFAULT NULL,
    popup_content TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_location (latitude, longitude),
    INDEX idx_city_state (city, state),
    INDEX idx_location_type (location_type),
    INDEX idx_denomination (denomination),
    INDEX idx_active (is_active)
);

-- 6. Questionnaires System (sample-questionnaires/ → questionnaires, questions, answers, responses)
-- Cognitive/personality assessments
CREATE TABLE IF NOT EXISTS questionnaires (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    age_group VARCHAR(50),
    version VARCHAR(20) DEFAULT '1.0',
    author VARCHAR(255),
    estimated_duration INT DEFAULT 15, -- minutes
    questionnaire_type ENUM('personality', 'cognitive', 'assessment', 'survey') DEFAULT 'assessment',
    target_audience VARCHAR(100),
    instructions TEXT,
    scoring_method VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_age_group (age_group),
    INDEX idx_type (questionnaire_type),
    INDEX idx_active (is_active)
);

CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    questionnaire_id INT NOT NULL,
    question_id VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('radio', 'checkbox', 'slider', 'textarea', 'scale', 'dropdown') NOT NULL,
    options JSON DEFAULT NULL,
    min_value INT DEFAULT NULL,
    max_value INT DEFAULT NULL,
    labels JSON DEFAULT NULL,
    placeholder TEXT DEFAULT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE,
    UNIQUE KEY unique_question_per_questionnaire (questionnaire_id, question_id),
    INDEX idx_questionnaire (questionnaire_id),
    INDEX idx_order (display_order),
    INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS questionnaire_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    questionnaire_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    session_id VARCHAR(255),
    participant_data JSON DEFAULT NULL, -- age, grade, etc.
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    total_score DECIMAL(10, 2) DEFAULT NULL,
    response_metadata JSON DEFAULT NULL,
    FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE,
    INDEX idx_questionnaire (questionnaire_id),
    INDEX idx_user (user_id),
    INDEX idx_session (session_id),
    INDEX idx_completed (is_completed)
);

CREATE TABLE IF NOT EXISTS question_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    response_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_text TEXT,
    answer_value JSON DEFAULT NULL,
    numeric_score DECIMAL(10, 2) DEFAULT NULL,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (response_id) REFERENCES questionnaire_responses(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_answer_per_response (response_id, question_id),
    INDEX idx_response (response_id),
    INDEX idx_question (question_id)
);

-- 7. OMB Editor (omb-editor → omb_documents, omb_edits, omb_templates)
-- Editor content, document history
CREATE TABLE IF NOT EXISTS omb_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT,
    document_type ENUM('page', 'article', 'template', 'note', 'reference') DEFAULT 'page',
    status ENUM('draft', 'published', 'archived', 'deleted') DEFAULT 'draft',
    author_id INT DEFAULT NULL,
    parent_document_id INT DEFAULT NULL,
    version_number INT DEFAULT 1,
    slug VARCHAR(255) UNIQUE,
    tags JSON DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    word_count INT DEFAULT 0,
    reading_time INT DEFAULT 0, -- minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (parent_document_id) REFERENCES omb_documents(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_type (document_type),
    INDEX idx_author (author_id),
    INDEX idx_parent (parent_document_id),
    INDEX idx_slug (slug),
    FULLTEXT idx_content_search (title, content)
);

CREATE TABLE IF NOT EXISTS omb_edits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    editor_id INT DEFAULT NULL,
    edit_type ENUM('create', 'update', 'delete', 'restore', 'version') DEFAULT 'update',
    content_before LONGTEXT,
    content_after LONGTEXT,
    changes_summary TEXT,
    edit_metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES omb_documents(id) ON DELETE CASCADE,
    INDEX idx_document (document_id),
    INDEX idx_editor (editor_id),
    INDEX idx_edit_type (edit_type),
    INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS omb_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL UNIQUE,
    template_content LONGTEXT NOT NULL,
    template_type ENUM('article', 'page', 'form', 'layout', 'component') DEFAULT 'page',
    description TEXT,
    variables JSON DEFAULT NULL, -- template variables
    preview_image VARCHAR(500),
    usage_count INT DEFAULT 0,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_type (template_type),
    INDEX idx_active (is_active),
    INDEX idx_usage (usage_count)
);

-- 8. BigBook System (om big book → bigbook_files, bigbook_tags, bigbook_notes, bigbook_index)
-- Main knowledge repository
CREATE TABLE IF NOT EXISTS bigbook_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type ENUM('markdown', 'html', 'pdf', 'doc', 'txt', 'image', 'video', 'audio') DEFAULT 'markdown',
    title VARCHAR(500),
    description TEXT,
    content LONGTEXT,
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(100),
    checksum VARCHAR(64),
    language VARCHAR(10) DEFAULT 'en',
    reading_level VARCHAR(50),
    topic_category VARCHAR(100),
    source VARCHAR(255),
    author VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    access_count INT DEFAULT 0,
    is_indexed BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_filename (filename),
    INDEX idx_file_type (file_type),
    INDEX idx_topic (topic_category),
    INDEX idx_language (language),
    INDEX idx_indexed (is_indexed),
    INDEX idx_active (is_active),
    FULLTEXT idx_content_search (title, description, content)
);

CREATE TABLE IF NOT EXISTS bigbook_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_name VARCHAR(100) NOT NULL UNIQUE,
    tag_description TEXT,
    tag_color VARCHAR(7) DEFAULT '#007bff',
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usage (usage_count)
);

CREATE TABLE IF NOT EXISTS bigbook_file_tags (
    file_id INT NOT NULL,
    tag_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (file_id, tag_id),
    FOREIGN KEY (file_id) REFERENCES bigbook_files(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES bigbook_tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bigbook_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL,
    user_id INT DEFAULT NULL,
    note_content TEXT NOT NULL,
    note_type ENUM('annotation', 'summary', 'question', 'highlight', 'bookmark') DEFAULT 'annotation',
    page_reference VARCHAR(100),
    position_data JSON DEFAULT NULL, -- for highlights, etc.
    is_private BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES bigbook_files(id) ON DELETE CASCADE,
    INDEX idx_file (file_id),
    INDEX idx_user (user_id),
    INDEX idx_type (note_type),
    INDEX idx_private (is_private)
);

CREATE TABLE IF NOT EXISTS bigbook_index (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id INT NOT NULL,
    term VARCHAR(255) NOT NULL,
    frequency INT DEFAULT 1,
    relevance_score DECIMAL(5, 4) DEFAULT 0.0000,
    context_snippet TEXT,
    position_info JSON DEFAULT NULL,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES bigbook_files(id) ON DELETE CASCADE,
    INDEX idx_file (file_id),
    INDEX idx_term (term),
    INDEX idx_relevance (relevance_score),
    FULLTEXT idx_term_search (term, context_snippet)
);

-- 9. Site Survey System (site-survey → site_survey_logs, site_errors, scan_results, endpoint_map)
-- Link crawler, API checker, broken references, performance analysis
CREATE TABLE IF NOT EXISTS site_survey_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scan_id VARCHAR(100) NOT NULL,
    scan_type ENUM('full', 'incremental', 'targeted', 'api_check', 'link_check') DEFAULT 'full',
    start_url VARCHAR(500) NOT NULL,
    scan_depth INT DEFAULT 3,
    total_pages_scanned INT DEFAULT 0,
    total_links_checked INT DEFAULT 0,
    total_errors_found INT DEFAULT 0,
    scan_duration INT DEFAULT 0, -- seconds
    status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
    user_agent VARCHAR(255),
    scan_settings JSON DEFAULT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_scan_id (scan_id),
    INDEX idx_status (status),
    INDEX idx_started (started_at)
);

CREATE TABLE IF NOT EXISTS site_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scan_id VARCHAR(100) NOT NULL,
    error_type ENUM('404', '500', 'timeout', 'redirect', 'ssl', 'dns', 'javascript', 'accessibility') NOT NULL,
    url VARCHAR(1000) NOT NULL,
    source_url VARCHAR(1000),
    error_message TEXT,
    http_status_code INT DEFAULT NULL,
    response_time INT DEFAULT NULL, -- milliseconds
    error_details JSON DEFAULT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    INDEX idx_scan_id (scan_id),
    INDEX idx_error_type (error_type),
    INDEX idx_severity (severity),
    INDEX idx_resolved (is_resolved),
    INDEX idx_url (url(255))
);

CREATE TABLE IF NOT EXISTS scan_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    scan_id VARCHAR(100) NOT NULL,
    url VARCHAR(1000) NOT NULL,
    page_title VARCHAR(500),
    http_status_code INT NOT NULL,
    response_time INT DEFAULT NULL, -- milliseconds
    page_size BIGINT DEFAULT NULL, -- bytes
    load_time INT DEFAULT NULL, -- milliseconds
    lighthouse_score JSON DEFAULT NULL,
    accessibility_score INT DEFAULT NULL,
    seo_score INT DEFAULT NULL,
    performance_score INT DEFAULT NULL,
    meta_data JSON DEFAULT NULL,
    links_found JSON DEFAULT NULL,
    images_found JSON DEFAULT NULL,
    scripts_found JSON DEFAULT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_scan_id (scan_id),
    INDEX idx_url (url(255)),
    INDEX idx_status (http_status_code),
    INDEX idx_performance (performance_score)
);

CREATE TABLE IF NOT EXISTS endpoint_map (
    id INT AUTO_INCREMENT PRIMARY KEY,
    endpoint_url VARCHAR(1000) NOT NULL UNIQUE,
    endpoint_type ENUM('api', 'page', 'asset', 'redirect', 'external') DEFAULT 'page',
    method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS') DEFAULT 'GET',
    description TEXT,
    authentication_required BOOLEAN DEFAULT FALSE,
    parameters JSON DEFAULT NULL,
    response_format ENUM('html', 'json', 'xml', 'text', 'binary') DEFAULT 'html',
    expected_status_code INT DEFAULT 200,
    last_tested TIMESTAMP NULL,
    last_response_code INT DEFAULT NULL,
    last_response_time INT DEFAULT NULL,
    uptime_percentage DECIMAL(5, 2) DEFAULT 100.00,
    is_monitored BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_endpoint_type (endpoint_type),
    INDEX idx_method (method),
    INDEX idx_monitored (is_monitored),
    INDEX idx_last_tested (last_tested)
);

-- 10. Logs System (logs/ → system_logs, user_activity_logs, error_logs, omai_logs)
-- Centralized logging with queryable retention policy
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    log_level ENUM('trace', 'debug', 'info', 'warn', 'error', 'fatal') NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    component VARCHAR(100),
    message TEXT NOT NULL,
    details JSON DEFAULT NULL,
    stack_trace TEXT DEFAULT NULL,
    request_id VARCHAR(100),
    session_id VARCHAR(255),
    user_id INT DEFAULT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_level (log_level),
    INDEX idx_service (service_name),
    INDEX idx_created (created_at),
    INDEX idx_request (request_id),
    INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    action_details JSON DEFAULT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    success BOOLEAN DEFAULT TRUE,
    duration_ms INT DEFAULT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_user (user_id),
    INDEX idx_action (action_type),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created (created_at),
    INDEX idx_success (success)
);

CREATE TABLE IF NOT EXISTS error_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    error_id VARCHAR(100) UNIQUE,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSON DEFAULT NULL,
    frequency INT DEFAULT 1,
    first_occurrence TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    last_occurrence TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    service_name VARCHAR(100),
    component VARCHAR(100),
    user_id INT DEFAULT NULL,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    INDEX idx_error_type (error_type),
    INDEX idx_service (service_name),
    INDEX idx_frequency (frequency),
    INDEX idx_first_occurrence (first_occurrence),
    INDEX idx_resolved (is_resolved)
);

CREATE TABLE IF NOT EXISTS omai_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    omai_session_id VARCHAR(100) NOT NULL,
    command VARCHAR(255),
    command_type VARCHAR(100),
    execution_status ENUM('started', 'completed', 'failed', 'timeout') NOT NULL,
    input_data JSON DEFAULT NULL,
    output_data JSON DEFAULT NULL,
    execution_time_ms INT DEFAULT NULL,
    user_id INT DEFAULT NULL,
    context_data JSON DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_session (omai_session_id),
    INDEX idx_command_type (command_type),
    INDEX idx_status (execution_status),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
);

-- Add log retention policies (can be implemented as scheduled events)
CREATE TABLE IF NOT EXISTS log_retention_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL UNIQUE,
    retention_days INT NOT NULL,
    cleanup_frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'weekly',
    last_cleanup TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default retention policies
INSERT INTO log_retention_policies (table_name, retention_days, cleanup_frequency) VALUES
('system_logs', 90, 'weekly'),
('user_activity_logs', 365, 'monthly'),
('error_logs', 180, 'weekly'),
('omai_logs', 180, 'weekly')
ON DUPLICATE KEY UPDATE 
retention_days = VALUES(retention_days),
cleanup_frequency = VALUES(cleanup_frequency);

-- Create indexes for improved query performance
CREATE INDEX idx_system_logs_cleanup ON system_logs (created_at, log_level);
CREATE INDEX idx_user_activity_cleanup ON user_activity_logs (created_at, user_id);
CREATE INDEX idx_error_logs_cleanup ON error_logs (first_occurrence, is_resolved);
CREATE INDEX idx_omai_logs_cleanup ON omai_logs (created_at, execution_status);

-- =====================================================
-- Migration Status Tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS migration_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    source_file VARCHAR(500),
    target_tables JSON NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
    records_migrated INT DEFAULT 0,
    total_records INT DEFAULT 0,
    error_message TEXT DEFAULT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_migration_name (migration_name)
);

-- Insert migration tracking records
INSERT INTO migration_status (migration_name, source_file, target_tables) VALUES
('omai_commands', 'omai-commands.json', '["omai_commands", "omai_command_contexts"]'),
('component_registry', 'auto-discovered-components.json', '["component_registry"]'),
('build_configs', 'build-config.json,paths.config.example', '["build_paths", "build_configs"]'),
('omai_policies', 'omai_security_policy.json', '["omai_policies"]'),
('parish_map_data', 'parish-map.tsx,sample-parish-map/', '["parish_map_data"]'),
('questionnaires', 'sample-questionnaires/', '["questionnaires", "questions", "questionnaire_responses", "question_answers"]'),
('omb_system', 'omb-editor/', '["omb_documents", "omb_edits", "omb_templates"]'),
('bigbook_system', 'bigbook/', '["bigbook_files", "bigbook_tags", "bigbook_file_tags", "bigbook_notes", "bigbook_index"]'),
('site_survey', 'site-survey/', '["site_survey_logs", "site_errors", "scan_results", "endpoint_map"]'),
('logs_system', 'logs/', '["system_logs", "user_activity_logs", "error_logs", "omai_logs"]')
ON DUPLICATE KEY UPDATE 
source_file = VALUES(source_file),
target_tables = VALUES(target_tables);