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
