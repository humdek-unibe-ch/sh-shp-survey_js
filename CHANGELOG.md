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
  - `startTimestamp ≥ 0` and `endTimestamp ≥ 0` when provided — enforced declaratively via `minValue: 0` on the Serializer, so SurveyJS' built-in number editor handles them with no custom hook
  - Cross-field rule `startTimestamp < endTimestamp` applies only when **both** timestamps are meaningful — i.e. concrete numbers strictly greater than zero
  - `null` / `undefined` / empty string / `0` on either timestamp are all treated as "not configured" — the user can clear either field at any time without the property panel complaining, and the runtime widget falls back to `start = 0` / `end = video.duration`
  - **Cross-field validation is enforced exclusively in the runtime widget**, surfaced as a question-level red banner above the live preview / runtime player. The original implementation hooked `creator.onPropertyValidationCustomError`, but that event only re-runs for the property currently being edited — an error attached to the OTHER property (e.g. an error on Start latched while End was briefly smaller during typing) would never be cleared by subsequent valid edits and would stay visible even when the configuration became valid (e.g. `start=15` / `end=45` still flashing "start must be < end"). The runtime banner has no per-property latching: the widget self-clears its question-level errors on every `afterRender` (errors are tagged `__fromVideoQuestion` so we never accidentally drop unrelated errors set by other code paths) and re-evaluates `getConfigError` from scratch each time

- **Required questions enforce a complete watch**
  - When a `video` question has `isRequired: true`, the user MUST watch to the configured `endTimestamp` (or to the file's natural end if no `endTimestamp` is set) before the survey lets them advance / submit
  - Implemented as a lazy, idempotent `survey.onValidateQuestion` hook attached on first render; emits the error message resolved by `getRequiredWatchMessage(question)` (see below)
  - `value.watched === true` is the gate — set by `attachPlaybackEnforcement` once `currentTime >= end - 0.05`. Anything weaker (never-played, paused mid-segment, abandoned near the end) keeps the question failing required-validation
  - As a safety net, an explicit `endTimestamp` greater than the actual file duration is now capped at `video.duration` on `loadedmetadata`, so a misconfigured upper bound can never make `watched` permanently unreachable

- **Localised required-watch alert** (`requiredWatchMessage`)
  - New optional property `requiredWatchMessage:text` on the `video` question class, registered with `isLocalizable: true` so SurveyJS treats it the same way as the question's built-in `title` / `description`:
    - It appears in the Creator's **Translation** tab — designers see a row labelled "Required-watch alert" under each video question with one input column per language defined in *Language Settings*. Filling those in produces JSON like `"requiredWatchMessage": { "default": "…", "de": "…" }` instead of a flat string.
    - `question.requiredWatchMessage` automatically resolves to the entry for `survey.locale`, falls back to the `default` locale entry if the active-locale entry is missing, and yields `""` when neither has been set.
  - On top of the SurveyJS-resolved value the widget layers a built-in translation backstop in `getRequiredWatchMessage(question)`: if the resolved value is empty (designer hasn't filled in anything), it looks the message up in `DEFAULT_REQUIRED_WATCH_MESSAGES` keyed by `survey.locale`. The CMS already pushes the active locale into `survey.locale` via `4_surveyJS.js`, so a German-locale page automatically gets the German alert with no per-question configuration.
  - Built-in locales: `en`, `de`, `fr`, `it`. Adding a locale is a one-line change to `DEFAULT_REQUIRED_WATCH_MESSAGES` in `5_videoSegmentWidget.js` — no other code edits needed.
  - Resolution order: SurveyJS-resolved per-locale string (Translation tab / property panel) → built-in translation for `survey.locale` → English default.

- **Auto-start playback** (`autoStart`)
  - New optional boolean property `autoStart` (default `false`) on the `video` question class. Toggle it on for "one-video-per-page" surveys where the participant should land on the page and have the video begin playing without an extra click.
  - Wired in `attachPlaybackEnforcement → onLoadedMetadata`: after seeking to `startTimestamp` (or `0` if unset), the widget calls `video.play()` and silently swallows the autoplay-policy rejection promise. The participant sees a paused player and presses play manually if the browser blocked it; nothing else changes.
  - **Suppressed** in two situations:
    1. Read-only mode (`question.isReadOnly`) — we should never restart a video the participant has already submitted an answer for.
    2. Creator Designer tab (`survey.isDesignMode === true`) — otherwise every property edit would re-fire playback in the preview pane and overlap audio across multiple video questions in the same survey.
  - **No implicit muting**: the video plays with its natural sound. Browser autoplay policies still apply — autoplay-with-sound usually requires a recent user gesture, so on the very first page of a directly-opened survey the browser may block the play attempt; on subsequent pages reached via the Next button it generally works.

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
