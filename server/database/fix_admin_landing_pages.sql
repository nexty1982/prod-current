-- Update landing pages to be more appropriate for user roles
UPDATE users 
SET landing_page = CASE 
    WHEN role = 'super_admin' THEN '/pages/admin/dashboard'
    WHEN role = 'admin' THEN '/pages/admin/dashboard'
    WHEN role = 'manager' THEN '/pages/manager/dashboard'
    ELSE '/pages/welcome'
END;

-- Verify the update
SELECT 'Updated landing pages:' as status;
SELECT id, email, first_name, last_name, role, landing_page FROM users;
