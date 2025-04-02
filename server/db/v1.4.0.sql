-- update plugin version
UPDATE `plugins`
SET version = 'v1.4.0'
WHERE `name` = 'survey-js';

-- add field `own_entries_only` to style `surveyJS`
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('own_entries_only'), '1', 'If enabled a person can edit only their own responses');

-- add new filed `dynamic_replacement` from type JSON
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'dynamic_replacement', get_field_type_id('json'), '0');
-- add field `dynamic_replacement` to style `surveyJS`
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('dynamic_replacement'), '', '#### Dynamic Survey JSON Replacement

The `dynamic_replacement` feature allows complex dynamic content in your surveys:

1. **How it Works**
   - Copy your survey JSON into the `dynamic_replacement` field
   - Use the mapper to define dynamic replacements
   - If this field contains content, it takes priority over the dropdown-selected survey

2. **Usage**
   - When empty: System uses the survey selected in the dropdown
   - When filled: System uses this JSON with mapped replacements
   - Useful for surveys needing complex dynamic content or customization');