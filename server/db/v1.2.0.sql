-- update plugin version
UPDATE `plugins`
SET version = 'v1.2.0'
WHERE `name` = 'survey-js';

-- delete field `jquery_builder_json`
DELETE FROM `fields`
WHERE `name` = 'jquery_builder_json';