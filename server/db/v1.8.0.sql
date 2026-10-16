UPDATE `plugins`
SET version = 'v1.8.0'
WHERE `name` = 'survey-js';

-- Guest studies that share one invite URL: mint a unique sid on first open,
-- append it to the query string, and key the row on extra_param_sid.
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`)
VALUES (NULL, 'auto_session_key', get_field_type_id('checkbox'), 0);

INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (get_style_id('surveyJS'), get_field_id('auto_session_key'), '0',
'If checked, each visitor gets a unique sid on first open (appended to the URL as ?sid=...). Rows are keyed on extra_param_sid so guests sharing one user cannot resume another guest. Use when everyone receives the same invite link. Leave update_based_on empty to use extra_param_sid; if update_based_on is already set, that column is kept and only the URL minting for its short name applies when the key is missing.');
