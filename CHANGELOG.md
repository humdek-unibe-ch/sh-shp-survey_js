# SurveyJS Plugin Changelog

## v1.4.8

### New Features

- **Video custom question type** (`video`)  
  - New SurveyJS custom question type (`5_videoSegmentWidget.js`) that supports both **full-video playback** and **restricted segment playback**.
  - Implemented as a **standalone class** (`Survey.Serializer.addClass(..., null, "empty")`); the custom widget's `htmlTemplate` is the sole renderer for the question. We deliberately do **not** extend the built-in `image` question — extending it caused the native image renderer to take over (full video playing, no segment clamping, no BASE_PATH resolution and a stray drag-and-drop / upload affordance for empty values).

- **Question properties**
  - Required:
    - `videoUrl` — "Video URL"
  - Optional (no defaults — the property-panel fields render blank, and the widget treats blank fields as "not configured"):
    - `startTimestamp` — start time in seconds (≥ 0)
    - `endTimestamp` — end time in seconds (≥ 0; `0` is treated as "not set" since a 0-second segment is nonsensical)
  - Behaviour:
    - Both unset (or end ≤ 0) → plays the entire video.
    - Only `startTimestamp` set → starts there and continues to natural end.
    - Only `endTimestamp` set → plays from 0 until that timestamp.
    - Both set with end > start → enforces exact playback segment.

- **Optional layout properties**  
  (renamed from image-question equivalents so the Creator UI says "Video ..." everywhere)
  - `videoFit` — "Video fit" (`none` | `contain` | `cover` | `fill`, default `contain`) → applied as `object-fit`
  - `videoHeight` — applied as CSS height
  - `videoWidth` — applied as CSS width

  All three update live in the Survey Creator preview through `registerFunctionOnPropertyValueChanged`.

- **No upload / drag-and-drop UI**  
  Because the type does not inherit from `image`, no native upload controls are shown. The only source is `videoUrl`.

- **Toolbox icon**
  - Video-camera SVG registered under `video-question`
  - Exposed globally as `window.__videoQuestionIconName`
  - When the host build does not expose `SurveyCreator.SvgRegistry`, the widget falls back to the built-in `icon-image`

- **Display name localization**
  - Creator / toolbox / dropdown labels display **Video**
  - Localization entries written into SurveyJS locale stores so the internal lowercase type key no longer appears raw.

- **Root-relative URL support**
  - `videoUrl` accepts paths like `/assets/video.mp4`
  - These resolve against `window.SELFHELP_BASE_PATH`
  - Absolute (`https://`), protocol-relative (`//...`), `data:` and `blob:` URLs pass through unchanged

- **Playback controls**
  - Playback begins at `startTimestamp` when provided
  - Users may pause, resume and seek freely within allowed bounds
  - Seeking outside bounds is automatically clamped
  - If `endTimestamp` is set, playback hard-stops there
  - Replay restarts from `startTimestamp` when relevant
  - If no `endTimestamp` is configured, the browser's normal end-of-file behaviour applies

- **Internal timestamp handling**
  - Unset `endTimestamp` is treated as `Infinity` until metadata loads
  - After `loadedmetadata`, it resolves to `video.duration`
  - Bound checks use `isFinite(end)` so missing end timestamps cleanly mean "no upper limit"

- **Validation**
  - URL is the only required field
  - `startTimestamp ≥ 0` and `endTimestamp ≥ 0` when provided
  - Cross-field rule `startTimestamp < endTimestamp` applies only when `endTimestamp` is a meaningful upper bound (set AND > 0)
  - Missing timestamps and `endTimestamp === 0` are valid and not flagged — the property panel can render number editors as `0` for blank fields, and we deliberately do not show a "0 must be < 0" error in that case

- **Continuous playback tracking**
  - Question value updates on meaningful playback events (`play`, `pause`, `seek`, `clamp`, `ended`)
  - Snapshot schema:

```jsonc
{
  "watched": true,
  "currentTime": 12.4,
  "startTimestamp": 5,
  "endTimestamp": null,
  "duration": null,
  "watchedSeconds": 7.4,
  "percentWatched": 0.32,
  "startedAt": "ISO timestamp",
  "lastUpdatedAt": "ISO timestamp",
  "lastEvent": "pause",
  "completedAt": null
}
```

## v1.4.7
### Bugfix
- Fixed an error that prevented opening a finished survey for editing (e.g. `/gfs-survey/<record_id>`). The page now loads without throwing an auto-save error.
- Fixed previously-saved answers not showing when re-opening a finished survey in edit mode; the form now restores the saved data and opens on the first page as expected.
- Fixed special characters in saved survey data being mangled in the page HTML, which could corrupt the restored answers.

## v1.4.6
### Bugfix
- Fixed Table of Contents (TOC) navigation so that clicking any page in the TOC jumps directly to that page instead of advancing only one page at a time for forward navigation
  - Root cause: SurveyJS v1.9.x internally steps through pages one at a time for forward navigation; any synchronous `setValue` calls during the `onCurrentPageChanged` event interrupted this stepping loop
  - Solution: Deferred all `setValue` and save operations in `onCurrentPageChanged` via `setTimeout` so the internal navigation loop completes before survey data is modified
  - Removed the `onCurrentPageChanging` handler entirely (no longer needed) to avoid triggering the page-stepping mechanism
  - Backward navigation, Next/Back button navigation, and data saving on page change all continue to work correctly

## v1.4.5
### Bugfix
- Fixed session expiration handling during survey editing
  - Users can now continue working after session expiry without losing changes
  - Added proper JSON responses for AJAX auto-save and publish operations
  - Improved error detection for authentication failures with user notification
  - Consistent modal alerts with automatic page reload on errors

## v1.4.4
### Bugfix
 - properly load special characters in SurveyJs in dynamic panel

## v1.4.3
### Bugfix
 - Fixed HTML editing for HTML questions by restricting Quill editor to text properties only

## v1.4.2
### Bugfix
- load in edit mode only if there are parameters expecting to pass the record id

## v1.4.1

### New Features
- [Issue #18](https://github.com/humdek-unibe-ch/sh-selfhelp_app/issues/18): Add `rich-text-editor` question type based on `Quill` editor

## v1.4.0 (Requires SelfHelp v7.3.1+)

### New Features
- **Edit Mode**: Load surveys in edit mode
- **Access Control**: Added `own_entries_only` to style `surveyJS`
  - When enabled, users can edit only their own responses
  - When disabled, users can edit foreign responses if they have access
- **Dynamic Dropdown Values**: Load values from RESTful service
  - Page Configuration: Use format `/survey-js/[v:data]?` where `data` is the variable name
  - Data must be in JSON format (do not use scope in data config)
  - In SurveyJS, configure under "Choices from RESTful service"
  - Set URL pattern: `your-domain.com/survey-js/TableName` (e.g., `test.com/survey-js/Task`)
  - Configure "values" and "display text" columns
- **Edit Mode Navigation**: Always start from page `0` when survey is in "finished" status
- **Dynamic Content**: Added `dynamic_replacement` field
  - Copy survey JSON into this field and use mapper for complex dynamic replacements
  - Takes priority over dropdown-selected survey when filled
- **Page Navigation**: Added `resetOnBack` property for SurveyJS Pages
  - When enabled, all answers on a page will be cleared when users navigate back to it
- **Build System**: Adjusted `gulpfile.js` to work with `gulp` v4 and removed `run-sequence`

### Bugfix
- Fixed the survey completion check for `once_per_user` and `once_per_schedule` options

## v1.3.11

### Bugfix
- [Issue #28](https://github.com/humdek-unibe-ch/sh-selfhelp_app/issues/28): Improved survey data merging
- Default values are now preserved when not explicitly set by the user

## v1.3.10

### Bugfix
- Improved UI updates after `publish` action
- Modified survey transmission format: Now sent as string instead of JSON object
- Prevents creation of multiple `input_vars` entries

## v1.3.9

### Bugfix
- Fixed dynamic values loading

## v1.3.8

### Bugfix
- Properly configured `csp` rules for voice recording functionality

## v1.3.7

### New Features
- [Issue #19] Added voice record question type
- Implemented dashboard support for voice recording questions

## v1.3.6 (Requires SelfHelp v7.0.0+)

### New Features
- Added compatibility with `user_input` refactoring from SelfHelp v7.0.0
- Automated dataTables integration:
  - New surveys are automatically added to dataTables
  - Survey `title` is used as `displayName` for dataTables
- [Issue #10] Removed `user_name` from `dashboard`

### Bugfix
- Added validation to check for selected survey in style before saving
- Prevented survey saving in CMS mode
- Fixed survey name display in dashboard

## v1.3.5

### Bugfix
- Fixed handling of `Boolean` JSON fields from SurveyJS creator to database

## v1.3.4

### Bugfix
- Prevented survey loading in CMS

## v1.3.3

### Bugfix
- Added validation for uploadTable existence before attempting to get last_response
- Improved handling of multiple surveys on the same page

## v1.3.2

### Bugfix
- [Issue #15] Removed local survey state storage - now retrieved from database
- [Issue #14] Implemented database save verification before page navigation
- Added alerts when data is not properly saved

## v1.3.1

### Bugfix
- Fixed survey active status detection when start time and end time are specified

## v1.3.0

### New Features
- Added `debug` field to style `surveyJS`

### Bugfix
- Fixed `entry_record` loading in `surveyJS`

## v1.2.6

### Bugfix
- Fixed survey completion check in CMS edit mode
- [Issue #12] Improved `once_per_scheduled` verification

## v1.2.5

### Bugfix
- Improved calculation of survey active status based on start/end times

## v1.2.4

### Bugfix
- Fixed loading path for minified files

## v1.2.3

### New Features
- Implemented plugin version loading using `BaseHook` class

## v1.2.2

### Improvements
- Added `uopz_allow_exit` when returning `json`
- Fixed relative paths for file uploads to work on both `windows` and `linux`

## v1.2.1

### Improvements
- Updated `SurveyJs` from `v1.9.85` to `v1.9.124`
- Enhanced file upload handling:
  - For questions with `storeDataAsText: false`, files are saved to server
  - Files stored in `/upload` folder with structure: `/survey_id/response_id/user_code/question_name/`
  - Files named as: `[survey_id][response_id][user_code][question_name]image_name`

## v1.2.0 (Requires SelfHelp 6.6.0)

### Changes
- Removed field `jquery_builder_json`
- [Issue #1] Added `timeout` field in style `surveyJS`
  - Starts new survey if timeout period has passed since survey start
- [Issue #4] Implemented comprehensive metadata collection:
  - `start_time`, `end_time`, `duration`, `pages`, `user_agent`, etc.

## v1.1.0

### New Features
- Added Content Security Policy (CSP) rules for pages containing SurveyJS

## v1.0.4

### New Features
- Added extra CSP rules for specific pages:
  - `moduleSurveyJSMode`
  - `moduleSurveyJSDashboard`

## v1.0.3

### Bug fix
- Added [`uopz_allow_exit(true)`](https://www.php.net/manual/en/function.uopz-allow-exit.php)

## v1.0.2

### Bug fix
- Fixed DB script v1.0.0
- Fixed capital letters for `Dashboard` and `Version` modules

## v1.0.1

### Bug fix
- Fixed PHP initialization variable checks

## v1.0.0

### New Features
- Initial release with core functionality:
  - SurveyJS related styles and components
  - Survey JS Creator
  - Survey JS Dashboard
  - Survey JS Versioning
  - Survey JS Style
