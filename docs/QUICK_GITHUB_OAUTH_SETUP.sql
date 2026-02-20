-- =====================================================
-- Configuration Rapide GitHub OAuth
-- =====================================================
-- Ce script permet d'enregistrer rapidement vos credentials
-- OAuth GitHub en base de données
--
-- ⚠️ Remplacez les valeurs YOUR_CLIENT_ID et YOUR_CLIENT_SECRET
--    par vos vraies credentials GitHub OAuth
-- =====================================================

-- Option 1: Insertion ou mise à jour (RECOMMANDÉ)
-- Utilise ON CONFLICT pour éviter les doublons
INSERT INTO service_api_configs (
  service_name,
  service_type,
  environment,
  is_active,
  is_default,
  config,
  metadata,
  created_at,
  updated_at
) VALUES (
  'github',
  'oauth',
  'production', -- ou 'development' pour local
  true,
  true,
  jsonb_build_object(
    'clientId', 'YOUR_CLIENT_ID',        -- ← REMPLACER ICI
    'clientSecret', 'YOUR_CLIENT_SECRET' -- ← REMPLACER ICI
  ),
  jsonb_build_object(
    'callbackUrl', 'http://localhost:3000/api/auth/oauth/github/callback', -- ← REMPLACER par votre URL
    'baseUrl', 'http://localhost:3000', -- ← REMPLACER par votre URL
    'createdVia', 'manual-sql'
  ),
  NOW(),
  NOW()
)
ON CONFLICT (service_name, environment)
DO UPDATE SET
  config = EXCLUDED.config,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- Vérification de la configuration
-- =====================================================

-- Voir toutes les configurations GitHub
SELECT 
  id,
  service_name,
  environment,
  is_active,
  config->>'clientId' as client_id,
  metadata->>'callbackUrl' as callback_url,
  created_at,
  updated_at
FROM service_api_configs
WHERE service_name = 'github'
ORDER BY environment;

-- =====================================================
-- Commandes de maintenance
-- =====================================================

-- Désactiver temporairement GitHub OAuth
-- UPDATE service_api_configs
-- SET is_active = false
-- WHERE service_name = 'github' AND environment = 'production';

-- Réactiver GitHub OAuth
-- UPDATE service_api_configs
-- SET is_active = true
-- WHERE service_name = 'github' AND environment = 'production';

-- Supprimer la configuration GitHub OAuth
-- DELETE FROM service_api_configs
-- WHERE service_name = 'github' AND environment = 'production';

-- =====================================================
-- Exemple de configuration complète multi-environnements
-- =====================================================

-- Production
INSERT INTO service_api_configs (service_name, service_type, environment, is_active, is_default, config, metadata)
VALUES (
  'github', 'oauth', 'production', true, true,
  jsonb_build_object('clientId', 'Ov23liPROD123', 'clientSecret', 'ghp_prod_secret'),
  jsonb_build_object('callbackUrl', 'https://neosaas.com/api/auth/oauth/github/callback', 'baseUrl', 'https://neosaas.com')
)
ON CONFLICT (service_name, environment) DO UPDATE SET config = EXCLUDED.config, metadata = EXCLUDED.metadata;

-- Staging
INSERT INTO service_api_configs (service_name, service_type, environment, is_active, is_default, config, metadata)
VALUES (
  'github', 'oauth', 'preview', true, false,
  jsonb_build_object('clientId', 'Ov23liSTAGING456', 'clientSecret', 'ghp_staging_secret'),
  jsonb_build_object('callbackUrl', 'https://staging.neosaas.com/api/auth/oauth/github/callback', 'baseUrl', 'https://staging.neosaas.com')
)
ON CONFLICT (service_name, environment) DO UPDATE SET config = EXCLUDED.config, metadata = EXCLUDED.metadata;

-- Development (localhost)
INSERT INTO service_api_configs (service_name, service_type, environment, is_active, is_default, config, metadata)
VALUES (
  'github', 'oauth', 'development', true, false,
  jsonb_build_object('clientId', 'Ov23liDEV789', 'clientSecret', 'ghp_dev_secret'),
  jsonb_build_object('callbackUrl', 'http://localhost:3000/api/auth/oauth/github/callback', 'baseUrl', 'http://localhost:3000')
)
ON CONFLICT (service_name, environment) DO UPDATE SET config = EXCLUDED.config, metadata = EXCLUDED.metadata;
