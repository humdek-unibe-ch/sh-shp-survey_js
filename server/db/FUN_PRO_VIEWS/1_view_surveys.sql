DROP VIEW IF EXISTS view_surveys;
CREATE VIEW view_surveys
AS
SELECT id, survey_generated_id, created_at, updated_at, JSON_SET(config, '$.survey_generated_id', survey_generated_id) AS config, JSON_UNQUOTE(JSON_EXTRACT(config, '$.title')) AS survey_name
FROM surveys;
