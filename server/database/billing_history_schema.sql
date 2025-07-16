-- Billing History table for tracking billing changes and events
-- This table stores a historical record of all billing-related actions

CREATE TABLE IF NOT EXISTS billing_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    action_type ENUM('subscription_created', 'subscription_updated', 'subscription_cancelled', 'subscription_renewed', 'invoice_generated', 'payment_received', 'payment_failed', 'refund_issued', 'plan_changed', 'billing_address_updated') NOT NULL,
    reference_table VARCHAR(50), -- 'subscriptions', 'invoices', 'payments', etc.
    reference_id INT, -- ID of the related record
    old_values JSON, -- Previous values before the change
    new_values JSON, -- New values after the change
    amount DECIMAL(10,2), -- Amount involved in the action (if applicable)
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT, -- Human-readable description of the action
    performed_by INT, -- User who performed the action (if applicable)
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON, -- Additional context data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_church_id (church_id),
    INDEX idx_action_type (action_type),
    INDEX idx_reference (reference_table, reference_id),
    INDEX idx_performed_at (performed_at)
);

-- Add some sample billing history data for testing
INSERT INTO billing_history (church_id, action_type, reference_table, reference_id, description, amount, currency) VALUES
(1, 'subscription_created', 'subscriptions', 1, 'Initial subscription created for Basic Plan', 29.99, 'USD'),
(1, 'invoice_generated', 'invoices', 1, 'Monthly invoice generated', 29.99, 'USD'),
(1, 'payment_received', 'invoices', 1, 'Payment successfully processed', 29.99, 'USD');
