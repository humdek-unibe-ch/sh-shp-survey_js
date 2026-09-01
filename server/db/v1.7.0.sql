-- =========================================================================
-- SurveyJS plugin — v1.7.0 migration
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 0) Bump the plugin version.
--    SurveyJS libraries upgraded to v3.0.2. The upgrade is library/asset only;
--    no schema, field, style or lookup changes are required.
-- ---------------------------------------------------------------------------
UPDATE `plugins`
SET version = 'v1.7.0'
WHERE `name` = 'survey-js';
