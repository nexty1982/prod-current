-- Add OMAI Markdown Ingestion tables to main database
-- These tables will be added to orthodmetrics_dev database

USE orthodmetrics_dev;

-- Markdown documents catalog
CREATE TABLE IF NOT EXISTS omai_md_catalog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingestion_id VARCHAR(255) NOT NULL UNIQUE,
    filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    content LONGTEXT NOT NULL,
    content_preview TEXT,
    file_size INT NOT NULL,
    source_agent VARCHAR(100) NOT NULL DEFAULT 'user',
    tags JSON,
    manual_tags TEXT,
    metadata JSON,
    status ENUM('ingested', 'parsed', 'indexed', 'error') DEFAULT 'ingested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ingestion_id (ingestion_id),
    INDEX idx_filename (filename(255)),
    INDEX idx_source_agent (source_agent),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_file_size (file_size),
    FULLTEXT idx_content_search (filename, content, manual_tags, content_preview)
);

-- Parsed markdown structure (Phase 2: Cataloging and Tagging)
CREATE TABLE IF NOT EXISTS omai_md_structure (
    id INT AUTO_INCREMENT PRIMARY KEY,
    catalog_id INT NOT NULL,
    structure_type ENUM('title', 'heading', 'checklist', 'code_block', 'table', 'link', 'image', 'list') NOT NULL,
    level INT DEFAULT 1,
    content TEXT NOT NULL,
    raw_content LONGTEXT,
    position_start INT,
    position_end INT,
    auto_tags JSON,
    extracted_concepts JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (catalog_id) REFERENCES omai_md_catalog(id) ON DELETE CASCADE,
    
    INDEX idx_catalog_id (catalog_id),
    INDEX idx_structure_type (structure_type),
    INDEX idx_level (level),
    INDEX idx_position (position_start, position_end),
    FULLTEXT idx_structure_content (content)
);

-- AI-Grep search index (Phase 3: Search Engine)
CREATE TABLE IF NOT EXISTS omai_md_search_index (
    id INT AUTO_INCREMENT PRIMARY KEY,
    catalog_id INT NOT NULL,
    search_vectors JSON,
    keywords JSON,
    concepts JSON,
    embeddings_hash VARCHAR(255),
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (catalog_id) REFERENCES omai_md_catalog(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_catalog_index (catalog_id),
    INDEX idx_embeddings_hash (embeddings_hash),
    INDEX idx_indexed_at (indexed_at)
);

-- Search query history for AI-Grep
CREATE TABLE IF NOT EXISTS omai_md_search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_text VARCHAR(1000) NOT NULL,
    query_type ENUM('natural_language', 'keyword', 'grep_command') DEFAULT 'natural_language',
    results_count INT DEFAULT 0,
    clicked_catalog_id INT,
    search_duration_ms INT,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    
    FOREIGN KEY (clicked_catalog_id) REFERENCES omai_md_catalog(id) ON DELETE SET NULL,
    
    INDEX idx_query_text (query_text(255)),
    INDEX idx_query_type (query_type),
    INDEX idx_clicked_catalog_id (clicked_catalog_id),
    INDEX idx_created_at (created_at),
    INDEX idx_session_id (session_id)
);

-- Agent references detected in markdown (Phase 4: Integration)
CREATE TABLE IF NOT EXISTS omai_md_agent_refs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    catalog_id INT NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    reference_context TEXT,
    reference_type ENUM('mention', 'instruction', 'output', 'attribution') DEFAULT 'mention',
    position_start INT,
    position_end INT,
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (catalog_id) REFERENCES omai_md_catalog(id) ON DELETE CASCADE,
    
    INDEX idx_catalog_id (catalog_id),
    INDEX idx_agent_name (agent_name),
    INDEX idx_reference_type (reference_type),
    INDEX idx_confidence_score (confidence_score)
);

SELECT 'OMAI Markdown Ingestion tables created successfully!' as status;