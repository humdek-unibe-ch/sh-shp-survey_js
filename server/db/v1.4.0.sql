-- update plugin version
UPDATE `plugins`
SET version = 'v1.4.0'
WHERE `name` = 'survey-js';

-- add field `own_entries_only` to style `surveyJS`
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('own_entries_only'), '1', 'If enabled a person can edit only their own responses');