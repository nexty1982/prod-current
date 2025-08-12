-- Create OMLearn Ethics Integration Tables
-- These tables support OMAI's ethical foundation based on OMLearn Human Reasoning Models

-- Table for storing user's ethical foundations derived from OMLearn responses
CREATE TABLE IF NOT EXISTS omai_ethical_foundations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  
  -- OMLearn survey context
  grade_group ENUM('kindergarten-2nd', '3rd-5th', '6th-8th', '9th-12th') NOT NULL,
  category ENUM('moral_development', 'ethical_thinking', 'reasoning_patterns', 'philosophical_concepts') NOT NULL,
  
  -- Question and response data
  question TEXT NOT NULL,
  user_response TEXT NOT NULL,
  reasoning TEXT,
  
  -- Foundation metadata
  confidence INT DEFAULT 85, -- Confidence score (0-100)
  weight DECIMAL(3,2) DEFAULT 1.0, -- Weight for moral reasoning (0.0-1.0)
  applied_contexts JSON, -- Contexts where this foundation has been applied
  
  -- Usage tracking
  reference_count INT DEFAULT 0,
  last_referenced DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_grade_group (grade_group),
  INDEX idx_category (category),
  INDEX idx_weight (weight),
  INDEX idx_confidence (confidence),
  FULLTEXT idx_question_response (question, user_response, reasoning)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tracking OMLearn survey progress
CREATE TABLE IF NOT EXISTS omlearn_surveys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  survey_id VARCHAR(50) NOT NULL, -- e.g., 'kindergarten-2nd', '3rd-5th'
  grade_group VARCHAR(100) NOT NULL,
  
  -- Survey progress
  status ENUM('not_started', 'in_progress', 'completed', 'skipped') NOT NULL DEFAULT 'not_started',
  completed_questions INT DEFAULT 0,
  total_questions INT NOT NULL,
  
  -- Survey metadata
  started_at DATETIME,
  completed_at DATETIME,
  
  -- Timestamps
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_survey (user_id, survey_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_grade_group (grade_group)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for detailed OMLearn question responses (optional, for detailed analysis)
CREATE TABLE IF NOT EXISTS omlearn_responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  survey_id VARCHAR(50) NOT NULL,
  
  -- Question details
  question_id VARCHAR(100) NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'open_ended', 'scenario_based', 'ranking') NOT NULL,
  
  -- Response data
  user_answer TEXT NOT NULL,
  reasoning_explanation TEXT,
  confidence_level INT, -- 1-5 scale
  
  -- Analysis data
  moral_weight DECIMAL(3,2), -- Calculated moral weight for this response
  complexity_score INT, -- Reasoning complexity (1-10)
  category_tags JSON, -- Tags for categorizing the moral reasoning
  
  -- Timestamps
  answered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_survey_id (survey_id),
  INDEX idx_question_id (question_id),
  INDEX idx_moral_weight (moral_weight),
  INDEX idx_complexity_score (complexity_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for tracking how ethical foundations influence OMAI's responses
CREATE TABLE IF NOT EXISTS omai_ethical_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  foundation_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Application context
  context_type ENUM('chat_response', 'decision_making', 'recommendation', 'task_completion') NOT NULL,
  context_data JSON, -- Details about where/how the foundation was applied
  
  -- Application results
  influence_weight DECIMAL(3,2), -- How much this foundation influenced the response
  outcome_rating INT, -- User feedback on the outcome (1-5)
  
  -- Timestamps
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (foundation_id) REFERENCES omai_ethical_foundations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_foundation_id (foundation_id),
  INDEX idx_user_id (user_id),
  INDEX idx_context_type (context_type),
  INDEX idx_applied_at (applied_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default OMLearn survey structure
INSERT IGNORE INTO omlearn_surveys (user_id, survey_id, grade_group, total_questions) 
SELECT 
  1 as user_id, -- This will be updated when actual users complete surveys
  'kindergarten-2nd' as survey_id,
  'Kindergarten - 2nd Grade' as grade_group,
  15 as total_questions
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
UNION ALL
SELECT 
  1 as user_id,
  '3rd-5th' as survey_id,
  '3rd - 5th Grade' as grade_group,
  20 as total_questions
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
UNION ALL
SELECT 
  1 as user_id,
  '6th-8th' as survey_id,
  '6th - 8th Grade' as grade_group,
  25 as total_questions
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
UNION ALL
SELECT 
  1 as user_id,
  '9th-12th' as survey_id,
  '9th - 12th Grade' as grade_group,
  30 as total_questions
WHERE EXISTS (SELECT 1 FROM users WHERE id = 1);

-- Create triggers to automatically update reference counts
DELIMITER $$

CREATE TRIGGER update_foundation_reference_count 
AFTER INSERT ON omai_ethical_applications
FOR EACH ROW
BEGIN
  UPDATE omai_ethical_foundations 
  SET reference_count = reference_count + 1,
      last_referenced = NOW()
  WHERE id = NEW.foundation_id;
END$$

DELIMITER ;

-- Create indexes for better performance on ethical reasoning queries
CREATE INDEX idx_ethical_foundations_user_category ON omai_ethical_foundations(user_id, category);
CREATE INDEX idx_ethical_foundations_weight_confidence ON omai_ethical_foundations(weight, confidence);
CREATE INDEX idx_survey_progress ON omlearn_surveys(user_id, status, completed_questions);

-- Sample ethical foundation (for demonstration - would be populated by actual OMLearn responses)
/*
INSERT INTO omai_ethical_foundations 
(user_id, grade_group, category, question, user_response, reasoning, confidence, weight, applied_contexts)
VALUES 
(1, 'kindergarten-2nd', 'moral_development', 
 'Is it okay to take something that doesn\'t belong to you?', 
 'No, it\'s not okay to take things that don\'t belong to you because it makes others sad and it\'s not fair.',
 'Taking things without permission is wrong because it hurts others and violates their trust. Everyone deserves to have their belongings respected.',
 90, 0.95, '[]');
*/

-- Verify table creation
SELECT 
  TABLE_NAME, 
  TABLE_ROWS, 
  CREATE_TIME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN (
    'omai_ethical_foundations', 
    'omlearn_surveys', 
    'omlearn_responses', 
    'omai_ethical_applications'
  )
ORDER BY TABLE_NAME; 