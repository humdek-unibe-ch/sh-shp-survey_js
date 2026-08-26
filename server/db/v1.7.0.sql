UPDATE `plugins`
SET version = 'v1.7.0'
WHERE `name` = 'survey-js';

-- Let a study choose what identifies a response row. Empty (the default) keys
-- on `response_id` as before. Set to a column, components sharing a data table
-- build one row. The column must identify a participant on its own: guest
-- writes share a user, so a repeated value merges people.
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`)
VALUES (NULL, 'update_based_on', get_field_type_id('text'), 0);

INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (get_style_id('surveyJS'), get_field_id('update_based_on'), '',
'Column that identifies a response row. Empty keeps the default: one row per submission, keyed on response_id. Set to a column name and the survey updates the row already holding that value - so several components sharing a survey_generated_id build one row. A key matching no row falls back to the default rather than inserting. The column must identify a single participant.');

-- `url_params` now also exposes route parameters, not only the query string.
-- Behaviour only, no schema change; the help text is updated to match.
UPDATE `styles_fields`
SET `help` = 'If enabled, parameters can be passed via the url, as a path segment or query string. Example: `?code=test&par1=2&par2=2`'
WHERE `id_styles` = get_style_id('surveyJS') AND `id_fields` = get_field_id('url_params');
