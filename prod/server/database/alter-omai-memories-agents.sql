-- Alter OMAI Memories Table for Agent Ingestion
-- This migration adds support for AI agent webhook ingestion

ALTER TABLE omai_memories
ADD COLUMN source_agent VARCHAR(100) DEFAULT NULL,
ADD COLUMN source_module VARCHAR(100) DEFAULT NULL,
ADD COLUMN importance ENUM('low', 'normal', 'high') DEFAULT 'normal',
ADD COLUMN agent_metadata JSON DEFAULT NULL,
ADD COLUMN ingestion_method ENUM('manual', 'webhook', 'scheduled') DEFAULT 'manual',
ADD INDEX idx_source_agent (source_agent),
ADD INDEX idx_importance (importance),
ADD INDEX idx_ingestion_method (ingestion_method);

-- Update existing records to have proper ingestion method
UPDATE omai_memories 
SET ingestion_method = 'manual' 
WHERE source = 'omai_consume'; 