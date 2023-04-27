-- add plugin entry in the plugin table
INSERT IGNORE INTO plugins (name, version) 
VALUES ('survey-js', 'v1.0.0');

-- register hook get_csp_rules
INSERT IGNORE INTO `hooks` (`id_hookTypes`, `name`, `description`, `class`, `function`, `exec_class`, `exec_function`, `priority`) VALUES ((SELECT id FROM lookups WHERE lookup_code = 'hook_overwrite_return' LIMIT 0,1), 'survey-js-addCspRule', 'Add csp rule for SurveyJS', 'BasePage', 'getCspRules', 'SurveyJSHooks', 'setCspRules', 1);

-- Add new style `surveyJS`
INSERT IGNORE INTO `styles` (`name`, `id_type`, `id_group`, `description`) VALUES ('surveyJS', (SELECT id FROM styleType WHERE `name` = 'component'), (select id from styleGroup where `name` = 'Wrapper' limit 1), 'A style which takes a survey and load it on the page');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('css'), NULL, 'Allows to assign CSS classes to the root item of the style.');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('css_mobile'), NULL, 'Allows to assign CSS classes to the root item of the style for the mobile version.');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('condition'), NULL, 'The field `condition` allows to specify a condition. Note that the field `condition` is of type `json` and requires\n1. valid json syntax (see https://www.json.org/)\n2. a valid condition structure (see https://github.com/jwadhams/json-logic-php/)\n\nOnly if a condition resolves to true the sections added to the field `children` will be rendered.\n\nIn order to refer to a form-field use the syntax `"@__form_name__#__from_field_name__"` (the quotes are necessary to make it valid json syntax) where `__form_name__` is the value of the field `name` of the style `formUserInput` and `__form_field_name__` is the value of the field `name` of any form-field style.');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`, `hidden`) VALUES (get_style_id('surveyJS'), get_field_id('jquery_builder_json'), '', 'This field contains the JSON structure for the jquery builder. The field should be hidden', 1);
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('data_config'), '', 'Define data configuration for fields that are loaded from DB and can be used inside the style with their param names. The name of the field can be used between {{param_name}} to load the required value');

-- Add new field type `select-survey-js` and field `survey` in style qualtricsSurvey
INSERT IGNORE INTO `fieldType` (`id`, `name`, `position`) VALUES (NULL, 'select-survey-js', '7');
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'survey-js', get_field_type_id('select-survey-js'), '0');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) 
VALUES (get_style_id('surveyJS'), get_field_id('survey-js'), '', 'Select a survey. The survey first should be created in module SurveyJS.');

-- add field restart_on_refresh to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'restart_on_refresh', get_field_type_id('checkbox'), '0');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('restart_on_refresh'), 0, 'If checked the survey is restarted on refresh');

-- add field once_per_schedule to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'once_per_schedule', get_field_type_id('checkbox'), '0');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('once_per_schedule'), 0, 'If checked the survey can be done once per schedule');

-- add field once_per_user to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'once_per_user', get_field_type_id('checkbox'), '0');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('once_per_user'), 0, 'If checked the survey can be done only once by an user. The checkbox `once_per_schedule` is ignore if this is checked');

-- add field start_time to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'start_time', get_field_type_id('time'), '0');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('start_time'), '00:00', 'Start time when the survey should be available');

-- add field end_time to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'end_time', get_field_type_id('time'), '0');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('end_time'), '00:00', 'End time when the survey should be not available anymore');

-- add field label_survey_done to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'label_survey_done', get_field_type_id('markdown'), 1);
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('label_survey_done'), null, 'Markdown text that is shown if the survey is done and it can be filled only once per schedule');

-- add field label_survey_not_active to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'label_survey_not_active', get_field_type_id('markdown'), 1);
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('label_survey_not_active'), null, 'Markdown text that is shown if the survey is not active right now.');

-- add field close_modal_at_end to style surveyJS
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'close_modal_at_end', get_field_type_id('checkbox'), '0');
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('close_modal_at_end'), 0, '`Only for mobile` - if selected the modal form will be closed once the survey is done');

-- add field redirect_at_end to style surveyJS
INSERT INTO `fields` (`id`, `name`, `id_type`, `display`) VALUES (NULL, 'redirect_at_end', get_field_type_id('text'), '0');
INSERT INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`) VALUES (get_style_id('surveyJS'), get_field_id('redirect_at_end'), null, 'Redirect to this url at the end of the survey');

-- add hook to load surveyJS in the style surveyJS in edit mode
INSERT IGNORE INTO `hooks` (`id_hookTypes`, `name`, `description`, `class`, `function`, `exec_class`, `exec_function`)
VALUES ((SELECT id FROM lookups WHERE lookup_code = 'hook_overwrite_return' LIMIT 0,1), 'field-surveyJS-edit', 'Output select SurveyJS field - edit mdoe', 'CmsView', 'create_field_form_item', 'SurveyJSHooks', 'outputFieldSurveyJSEdit');

-- add hook to load surveyJS in the style surveyJS in view mode
INSERT IGNORE INTO `hooks` (`id_hookTypes`, `name`, `description`, `class`, `function`, `exec_class`, `exec_function`)
VALUES ((SELECT id FROM lookups WHERE lookup_code = 'hook_overwrite_return' LIMIT 0,1), 'field-surveyJS-view', 'Output select SurveyJS field - view mdoe', 'CmsView', 'create_field_item', 'SurveyJSHooks', 'outputFieldSurveyJSView');

SET @id_modules_page = (SELECT id FROM pages WHERE keyword = 'sh_modules');

 -- add SurveyJS module page
INSERT IGNORE INTO `pages` (`id`, `keyword`, `url`, `protocol`, `id_actions`, `id_navigation_section`, `parent`, `is_headless`, `nav_position`, `footer_position`, `id_type`, `id_pageAccessTypes`) 
VALUES (NULL, 'moduleSurveyJS', '/admin/suveyJS', 'GET|POST', '0000000002', NULL, @id_modules_page, '0', '94', NULL, '0000000001', (SELECT id FROM lookups WHERE type_code = "pageAccessTypes" AND lookup_code = "mobile_and_web"));
SET @id_page = (SELECT id FROM pages WHERE keyword = 'moduleSurveyJS');

INSERT IGNORE INTO `pages_fields_translation` (`id_pages`, `id_fields`, `id_languages`, `content`) VALUES (@id_page, '0000000008', '0000000001', 'Module SurveyJS');
INSERT IGNORE INTO `pages_fields_translation` (`id_pages`, `id_fields`, `id_languages`, `content`) VALUES (@id_page, '0000000054', '0000000001', '');
INSERT IGNORE INTO `acl_groups` (`id_groups`, `id_pages`, `acl_select`, `acl_insert`, `acl_update`, `acl_delete`) VALUES ('0000000001', @id_page, '1', '0', '1', '0');
INSERT IGNORE INTO `pages_fields_translation` (`id_pages`, `id_fields`, `id_languages`, `content`) VALUES (@id_page, get_field_id('title'), '0000000001', 'Module SurveyJS');
INSERT IGNORE INTO `pages_fields_translation` (`id_pages`, `id_fields`, `id_languages`, `content`) VALUES (@id_page, get_field_id('title'), '0000000002', 'Module SurveyJS');

-- add form action insert/update/select/delete
INSERT IGNORE INTO `pages` (`id`, `keyword`, `url`, `protocol`, `id_actions`, `id_navigation_section`, `parent`, `is_headless`, `nav_position`, `footer_position`, `id_type`, `id_pageAccessTypes`) 
VALUES (NULL, 'moduleSurveyJSMode', '/admin/suveyJS/[select|update|insert|delete:mode]?/[i:sid]?', 'GET|POST', '0000000002', NULL, @id_modules_page, '0', NULL, NULL, '0000000001', (SELECT id FROM lookups WHERE type_code = "pageAccessTypes" AND lookup_code = "mobile_and_web"));
SET @id_page =(SELECT id FROM pages WHERE keyword = 'moduleSurveyJSMode');

INSERT IGNORE INTO `pages_fields_translation` (`id_pages`, `id_fields`, `id_languages`, `content`) VALUES (@id_page, '0000000008', '0000000001', 'Survey JS');
INSERT IGNORE INTO `acl_groups` (`id_groups`, `id_pages`, `acl_select`, `acl_insert`, `acl_update`, `acl_delete`) VALUES ('0000000001', @id_page, '1', '1', '1', '1');
INSERT IGNORE INTO `pages_fields_translation` (`id_pages`, `id_fields`, `id_languages`, `content`) VALUES (@id_page, get_field_id('title'), '0000000001', 'Survey JS');
INSERT IGNORE INTO `pages_fields_translation` (`id_pages`, `id_fields`, `id_languages`, `content`) VALUES (@id_page, get_field_id('title'), '0000000002', 'Survey JS');

-- add table formActions
CREATE TABLE IF NOT EXISTS `surveys` (
	`id` INT(10) UNSIGNED ZEROFILL NOT NULL PRIMARY KEY  AUTO_INCREMENT,		
	`survey_generated_id` VARCHAR(20) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `config` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



DROP VIEW IF EXISTS view_surveys;
CREATE VIEW view_surveys
AS
SELECT id, survey_generated_id, created_at, updated_at, JSON_SET(config, '$.survey_generated_id', survey_generated_id) AS config, 
JSON_UNQUOTE(
    IF(
      JSON_CONTAINS_PATH(config, 'one', '$.title.default'),
      JSON_EXTRACT(config, '$.title.default'),
      JSON_EXTRACT(config, '$.title')
    )
  ) AS survey_name
FROM surveys;

