-- Multilingual Billing System Database Schema for OrthodoxMetrics
-- Created: July 3, 2025

-- Churches/Organizations table (if not exists)
CREATE TABLE IF NOT EXISTS churches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    preferred_language ENUM('en', 'gr', 'ru', 'ro') DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Billing plans table
CREATE TABLE billing_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_quarterly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    features JSON,
    max_users INT DEFAULT NULL,
    max_records INT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default billing plans
INSERT INTO billing_plans (plan_code, name, description, price_monthly, price_quarterly, price_yearly, features, max_users, max_records) VALUES
('basic', 'Basic Plan', 'Essential features for small churches', 29.99, 79.99, 299.99, '["record_management", "basic_reports", "email_support"]', 5, 1000),
('plus', 'Plus Plan', 'Advanced features for growing churches', 59.99, 159.99, 599.99, '["record_management", "advanced_reports", "invoice_generation", "email_support", "phone_support"]', 15, 5000),
('admin_suite', 'Admin Suite', 'Complete solution for large churches and dioceses', 99.99, 269.99, 999.99, '["record_management", "advanced_reports", "invoice_generation", "multi_church_management", "priority_support", "custom_integrations"]', NULL, NULL);

-- Subscriptions table
CREATE TABLE subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    plan_id INT NOT NULL,
    billing_cycle ENUM('monthly', 'quarterly', 'yearly') NOT NULL,
    start_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    status ENUM('active', 'suspended', 'cancelled', 'trial') DEFAULT 'trial',
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    stripe_subscription_id VARCHAR(100) UNIQUE,
    trial_ends_at DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES billing_plans(id)
);

-- Invoices table
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    church_id INT NOT NULL,
    subscription_id INT,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    language ENUM('en', 'gr', 'ru', 'ro') DEFAULT 'en',
    status ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
    pdf_path VARCHAR(500),
    html_content LONGTEXT,
    stripe_invoice_id VARCHAR(100) UNIQUE,
    payment_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

-- Invoice items table
CREATE TABLE invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    description TEXT NOT NULL,
    description_key VARCHAR(100), -- For translation lookup
    amount DECIMAL(10,2) NOT NULL,
    quantity INT DEFAULT 1,
    line_total DECIMAL(10,2) NOT NULL,
    item_type ENUM('subscription', 'addon', 'discount', 'tax', 'fee') DEFAULT 'subscription',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Payment methods table
CREATE TABLE payment_methods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    stripe_payment_method_id VARCHAR(100) NOT NULL,
    type ENUM('card', 'bank_account') DEFAULT 'card',
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month INT,
    exp_year INT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    church_id INT NOT NULL,
    stripe_payment_intent_id VARCHAR(100) UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'succeeded', 'failed', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_method_id INT,
    failure_reason TEXT,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
);

-- Billing events log table
CREATE TABLE billing_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    event_type ENUM('subscription_created', 'subscription_updated', 'subscription_cancelled', 'invoice_created', 'invoice_paid', 'invoice_failed', 'payment_succeeded', 'payment_failed') NOT NULL,
    reference_id INT, -- Can be subscription_id, invoice_id, etc.
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Discounts and credits table
CREATE TABLE billing_credits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    reason TEXT,
    applied_to_invoice_id INT DEFAULT NULL,
    created_by_admin_id INT DEFAULT NULL,
    expires_at DATE DEFAULT NULL,
    status ENUM('available', 'applied', 'expired') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_to_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_subscriptions_church_status ON subscriptions(church_id, status);
CREATE INDEX idx_invoices_church_date ON invoices(church_id, date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_billing_events_church_type ON billing_events(church_id, event_type);
