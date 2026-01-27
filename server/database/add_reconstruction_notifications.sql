-- Add reconstruction notification types
INSERT INTO notification_types (name, description, category, default_enabled) VALUES
('reconstruction_update', 'System reconstruction and refactoring updates', 'admin', TRUE),
('om_librarian_discovery', 'OM-Librarian forensic discovery alerts', 'admin', TRUE),
('shift_completed', 'Development shift completion notifications', 'admin', TRUE),
('build_completed', 'Build completion notifications', 'system', TRUE),
('build_failed', 'Build failure notifications', 'system', TRUE)
ON DUPLICATE KEY UPDATE description=VALUES(description);
