-- Add questionnaire response storage table
CREATE TABLE IF NOT EXISTS omai_survey_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    questionnaire_id VARCHAR(255) NOT NULL,
    user_id INT,
    responses JSON NOT NULL,
    age_group VARCHAR(50),
    questionnaire_title VARCHAR(500),
    progress_percent DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_questionnaire_id (questionnaire_id),
    INDEX idx_user_id (user_id),
    INDEX idx_age_group (age_group),
    INDEX idx_completed (is_completed),
    INDEX idx_created_at (created_at)
); 