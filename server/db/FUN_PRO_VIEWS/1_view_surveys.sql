DROP VIEW IF EXISTS view_surveys;
CREATE VIEW view_surveys
AS
SELECT *, JSON_UNQUOTE(JSON_EXTRACT(config, '$.title')) AS survey_name
FROM surveys;
