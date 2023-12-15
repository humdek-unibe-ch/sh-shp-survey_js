-- update plugin version
UPDATE `plugins`
SET version = 'v1.3.0'
WHERE `name` = 'survey-js';

-- add field timeout to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'timeout', get_field_type_id('number'), 0);
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('timeout'), 0, 'When a non-zero value is set for this field, it serves as a `Survey Timeout` or `Survey Expiry Time`. This setting determines the time window, in minutes, during which a user can complete a survey from the moment they start it.

For instance, if you set this value to 10, and a user initiates the survey but fails to complete it within 10 **minutes**, the survey will no longer be active for that user. In such cases, the survey may reset to its initial state, allowing the user to start from the beginning.

Additionally, if the `once_per_user` feature is enabled, the survey will also become inactive for the user once the specified timeout period is reached, regardless of their progress. This ensures that the survey is not accessible beyond the defined timeframe, promoting a consistent user experience.');