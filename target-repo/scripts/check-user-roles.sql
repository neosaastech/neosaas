-- Check user roles for chvandendriessche@neomnia.net
SELECT
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.is_active,
  r.name as role_name,
  r.scope as role_scope,
  c.name as company_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.email = 'chvandendriessche@neomnia.net';

-- Check all admin/super_admin users
SELECT
  u.email,
  u.first_name,
  u.last_name,
  r.name as role_name,
  r.scope
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name IN ('admin', 'super_admin');

-- Check all users and their roles
SELECT
  u.email,
  u.first_name || ' ' || u.last_name as full_name,
  STRING_AGG(r.name, ', ') as roles,
  u.is_active
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.is_active
ORDER BY u.created_at DESC;
