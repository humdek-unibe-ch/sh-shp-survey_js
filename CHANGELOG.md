# v1.3.11
### Bugfix
 - [bug](https://github.com/humdek-unibe-ch/sh-selfhelp_app/issues/28) - merge the survey data. The default value is kept if not set by the user.

# v1.3.10
### Bugfix
 - properly update UI after `publish`
 - send the survey as string instead of JSON object which is accepted as an array and creates many `input_vars`

# v1.3.9
### Bugfix
 - properly load dynamic values

# v1.3.8
### Bugfix
 - properly set `csp` rules for the voice recording

# v1.3.7
### New Features
 - #19 - add voice record question
 - load the voice record questions in the dashboard

# v1.3.6 - Requires SelfHelp v7.0.0+
### New Features
 - add computability with `user_input` refactoring from SelfHelp v7.0.0 
 - when a new survey is created it is automatically added to the dataTables.
 - when a survey `title` is set, it is used for `displayName` for the `dataTables`
 - #10 remove `user_name` from `dashboard`
### Bugfix
 - check if there is a selected survey in the style before trying to save
 - do not try to save the survey in CMS mode
 - properly show the survey name in the dashboard

# v1.3.5
### Bugfix
 - properly save `Boolean` JSON fields from SurveyJS creator to the DB

# v1.3.4
### Bugfix
 - do not load the survey in the CMS

# v1.3.3
### Bugfix
 - check if the uploadTable with survey name exists before trying to get the last_response
 - properly handle multiple surveys on the same page

# v1.3.2
### Bugfix
 - #15 - No more keep a local state of the survey. Now the state is retrieved from DB.
 - #14 - Check if the data is saved in DB and then move to the next page. Show alerts when the data is not properly saved.

# v1.3.1
### Bugfix
 - properly return if the survey is active when there is a start time and end time

# v1.3.0
### New Features
 - add field `debug` to style `surveyJS`

### Bugfix
 - properly load `entry_record` in the `surveyJS`

# v1.2.6
### Bugfix
 - fix the check if the survey is done in CMS edit mode
 - #12 - now properly check `once_per_scheduled`

# v1.2.5
### Bugfix
 - properly calculate when the survey is active based on start time and end time

# v1.2.4
### Bugfix
 - fix loading path for minified files 

# v1.2.3
### New Features
 - load plugin version using `BaseHook` class

# v1.2.2
 - add `uopz_allow_exit` when returns `json`
 - adjust relative paths for uploading files to work on `windows` and `linux`

# v1.2.1
 - update `SurveyJs` from `v1.9.85` to `v1.9.124`
 - when questions from type `File Upload` has `storeDataAsText` set to false, the files are uploaded to the server in folder `upload` in the plugin folder. Inside that folder automatically is created a folder structure /survey_id/response_id/user_code/question_name/image_name, where image file is saved as `[survey_id][response_id][user_code][question_name]image_name`

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
