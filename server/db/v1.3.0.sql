-- update plugin version
UPDATE `plugins`
SET version = 'v1.3.0'
WHERE `name` = 'survey-js';

-- add `debug` field to style `surveyJS`
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('debug'), 0, 'If *checked*, debug messages will be rendered to the screen. These might help to understand the result of a condition evaluation. **Make sure that this field is *unchecked* once the page is productive**.');