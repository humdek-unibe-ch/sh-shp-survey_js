-- =========================================================================
-- SurveyJS plugin — v1.6.0 migration
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 0) Bump the plugin version.
-- ---------------------------------------------------------------------------
UPDATE `plugins`
SET version = 'v1.6.0'
WHERE `name` = 'survey-js';

-- ---------------------------------------------------------------------------
-- 1) Update the help text for the survey-js field to reflect that only
--    published surveys appear in the select.
-- ---------------------------------------------------------------------------
UPDATE `styles_fields`
SET `help` = 'Select a survey. The survey must first be created and published in the SurveyJS module.'
WHERE `id_styles` = get_style_id('surveyJS')
  AND `id_fields` = get_field_id('survey-js');

-- ---------------------------------------------------------------------------
-- 2) Remove the CMS survey-js-theme field. SurveyJS v2 theming is CSS-only
--    (survey-core.min.css); StylesManager.applyTheme() no longer exists.
-- ---------------------------------------------------------------------------
DELETE FROM `styles_fields`
WHERE `id_styles` = get_style_id('surveyJS')
  AND `id_fields` = get_field_id('survey-js-theme');

DELETE FROM `sections_fields_translation`
WHERE `id_fields` = get_field_id('survey-js-theme');

DELETE FROM `lookups`
WHERE `type_code` = 'survey-js-themes';
