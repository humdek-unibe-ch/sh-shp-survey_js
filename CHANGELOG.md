# v1.2.0 - Requires SelfHelp 6.6.0
 - remove field `jquery_builder_json`
 - #1 add field `timeout` in style `surveyJS` and if the time has passed since the survey was started it will start a new survey.
 - #4 collect metadata for surveys: `start_time`, `end_time`, `duration`, `pages`, `user_agent`, etc.

# v1.1.0
### New Features
 - load CSP rules for pages that contains SurveyJS

# v1.0.4
### New Features
 - add extra CSP rules only for pages: `moduleSurveyJSMode` and `moduleSurveyJSDashboard`

# v1.0.3
### Bug fix
 - add [uopz_allow_exit(true);](https://www.php.net/manual/en/function.uopz-allow-exit.php);

# v1.0.2
### Bug fix
 - fix DB script v1.0.0
 - fix capital letters for `Dashboard` and `Version` modules

# v1.0.1
### Bug fix
 - php init variables checks 

# v1.0.0

### New Features

 - The SurveyJS related styles and components
 - Survey JS Creator
 - Survey JS Dashboard
 - Survey JS Versioning
 - Survey JS Style
