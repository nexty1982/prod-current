-- nginx_proxy_entries: Central registry for nginx proxy location blocks
-- Used by /api/admin/nginx to generate config for inner (.239) and outer (.221) servers

CREATE TABLE IF NOT EXISTS nginx_proxy_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location_path VARCHAR(255) NOT NULL,
  location_modifier VARCHAR(10) DEFAULT NULL COMMENT 'null, ^~, =, ~*',
  description VARCHAR(500) DEFAULT NULL,

  backend_port INT NOT NULL COMMENT '3001=OM, 7060=OMAI',
  target_path VARCHAR(255) DEFAULT NULL COMMENT 'null = same as location_path',
  outer_mode ENUM('via_inner','direct') NOT NULL DEFAULT 'via_inner'
    COMMENT 'via_inner=outer→.239:80; direct=outer→.239:<port>',

  is_websocket TINYINT(1) NOT NULL DEFAULT 0,
  cookie_forwarding TINYINT(1) NOT NULL DEFAULT 1,
  cookie_domain_rewrite TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Inner only: rewrite cookie domains',
  intercept_errors_off TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Outer only: proxy_intercept_errors off',
  client_max_body VARCHAR(10) DEFAULT NULL COMMENT 'e.g. 50M',
  connect_timeout VARCHAR(10) DEFAULT '300s',
  send_timeout VARCHAR(10) DEFAULT '300s',
  read_timeout VARCHAR(10) DEFAULT '300s',

  inner_extra TEXT DEFAULT NULL COMMENT 'Extra nginx directives for inner block',
  outer_extra TEXT DEFAULT NULL COMMENT 'Extra nginx directives for outer block',

  scope ENUM('both','inner_only','outer_only') NOT NULL DEFAULT 'both',
  sort_order INT NOT NULL DEFAULT 100,
  is_catch_all TINYINT(1) NOT NULL DEFAULT 0,
  enabled TINYINT(1) NOT NULL DEFAULT 1,

  inner_applied_at TIMESTAMP NULL DEFAULT NULL,
  outer_applied_at TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_location (location_path),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed existing proxy entries from current nginx configs
INSERT INTO nginx_proxy_entries
  (name, location_path, location_modifier, description, backend_port, target_path, outer_mode,
   is_websocket, cookie_forwarding, cookie_domain_rewrite, intercept_errors_off,
   client_max_body, connect_timeout, send_timeout, read_timeout,
   inner_extra, outer_extra, scope, sort_order, is_catch_all)
VALUES
  ('Workspaces API', '/api/workspaces', NULL, 'OMAI workspace management API', 7060, '/api/workspaces/', 'via_inner',
   0, 1, 1, 1, NULL, '300s', '300s', '300s',
   NULL, NULL, 'both', 10, 0),

  ('OMAI Daily API', '/api/omai-daily/', NULL, 'OMAI Daily work items and dashboard', 7060, NULL, 'via_inner',
   0, 1, 1, 1, '50M', '300s', '300s', '300s',
   NULL, NULL, 'both', 20, 0),

  ('Admin API', '/api/admin/', NULL, 'Admin routes proxied through OMAI', 7060, NULL, 'via_inner',
   0, 1, 1, 1, '50M', '300s', '300s', '300s',
   NULL, NULL, 'both', 30, 0),

  ('Platform API', '/api/platform/', NULL, 'Platform status, workflows, badges', 7060, NULL, 'via_inner',
   0, 1, 1, 1, NULL, '300s', '300s', '300s',
   NULL, NULL, 'both', 40, 0),

  ('Tutorials API', '/api/tutorials/', NULL, 'Tutorials content API', 7060, NULL, 'via_inner',
   0, 1, 1, 1, NULL, '300s', '300s', '300s',
   NULL, NULL, 'both', 50, 0),

  ('Analytics API', '/api/analytics/', NULL, 'Analytics and church enrichment data', 7060, NULL, 'via_inner',
   0, 1, 1, 1, NULL, '300s', '300s', '300s',
   NULL, NULL, 'inner_only', 55, 0),

  ('Architecture Audit API', '/api/architecture-audit/', NULL, 'Architecture audit endpoints', 7060, NULL, 'via_inner',
   0, 1, 1, 1, NULL, '300s', '300s', '300s',
   NULL, NULL, 'inner_only', 56, 0),

  ('Manual Prompts API', '/api/manual-prompts/', NULL, 'Manual prompt intake endpoints', 7060, NULL, 'via_inner',
   0, 1, 1, 1, NULL, '300s', '300s', '300s',
   NULL, NULL, 'inner_only', 57, 0),

  ('OMAI Berry UI', '/omai/', '^~', 'OMAI Berry frontend application', 7060, NULL, 'via_inner',
   0, 0, 0, 0, NULL, '300s', '300s', '300s',
   'proxy_buffering    off;\n    proxy_read_timeout 30s;\n\n    error_page 502 503 504 =503 @omai_updating;',
   NULL, 'both', 60, 0),

  ('WebSocket: OMAI Logger', '/ws/omai-logger', NULL, 'Real-time log streaming WebSocket', 3001, NULL, 'direct',
   1, 0, 0, 0, NULL, '7d', '7d', '7d',
   NULL, NULL, 'both', 70, 0),

  ('Socket.IO', '/socket.io/', NULL, 'Socket.IO real-time connection', 3001, NULL, 'direct',
   1, 1, 0, 0, NULL, '7d', '7d', '7d',
   NULL, NULL, 'both', 75, 0),

  ('GitHub Webhooks', '/webhooks/', NULL, 'GitHub webhook receiver', 3001, NULL, 'via_inner',
   0, 0, 0, 0, NULL, '300s', '300s', '300s',
   'proxy_set_header   Content-Type $content_type;\n    proxy_pass_request_body on;',
   'proxy_set_header   Content-Type $content_type;\n    proxy_pass_request_body on;',
   'both', 80, 0),

  ('OM Backend Catch-All', '/api/', NULL, 'Catch-all for OM backend API (port 3001)', 3001, NULL, 'direct',
   0, 1, 1, 1, '50M', '300s', '300s', '300s',
   'proxy_set_header   Upgrade $http_upgrade;\n    proxy_set_header   Connection \"upgrade\";\n    proxy_set_header   X-Build-Type $http_x_build_type;\n    send_timeout          300s;\n    add_header Access-Control-Allow-Origin $http_origin always;\n    add_header Access-Control-Allow-Credentials true always;\n    add_header Access-Control-Allow-Methods \"GET, POST, PUT, DELETE, OPTIONS\" always;\n    add_header Access-Control-Allow-Headers \"Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With\" always;\n\n    if ($request_method = OPTIONS) {\n        add_header Access-Control-Allow-Origin \"*\";\n        add_header Access-Control-Allow-Methods \"GET, POST, OPTIONS, PUT, DELETE\";\n        add_header Access-Control-Allow-Headers \"Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With\";\n        add_header Access-Control-Max-Age 1728000;\n        add_header Content-Type \"text/plain; charset=utf-8\";\n        add_header Content-Length 0;\n        return 204;\n    }',
   'proxy_set_header   Upgrade $http_upgrade;\n    proxy_set_header   Connection \"upgrade\";\n    proxy_set_header   X-Build-Type $om_build_type;\n    proxy_set_header   X-Maintenance-Bypass $maintenance_bypass;\n    send_timeout          300s;',
   'both', 900, 1);
