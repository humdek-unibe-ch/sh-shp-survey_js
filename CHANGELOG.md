# SurveyJS Plugin Changelog

## v1.4.8
### New Features
- **Video Segment custom question type** (`videoSegment`)
  - New SurveyJS custom question type (`5_videoSegmentWidget.js`) that plays
    a restricted video range.
  - Implemented as a **standalone class** (`Survey.Serializer.addClass(...,
    null, "empty")`); the custom widget's `htmlTemplate` is the sole
    renderer for the question. We deliberately do **not** extend the
    built-in `image` question — extending it caused the native image
    renderer to take over (full video playing, no segment clamping, no
    BASE_PATH resolution and a stray drag-and-drop / upload affordance for
    empty values).
  - Required properties:
    - `videoUrl` — "Video URL" (required)
    - `startTimestamp` — "Start timestamp (seconds)" (required, ≥ 0)
    - `endTimestamp` — "End timestamp (seconds)" (required, ≥ 0, must be
      strictly greater than `startTimestamp`)
  - Optional layout properties (renamed from the equivalent image-question
    properties so the Creator UI says "Video ..." everywhere) and now
    **functionally applied** to the `<video>` element:
    - `videoFit` — "Video fit" (`none` | `contain` | `cover` | `fill`,
      default `contain`) — applied as `object-fit` inline style.
    - `videoHeight` — "Video height (CSS-accepted values)" — applied as
      `style.height`.
    - `videoWidth` — "Video width (CSS-accepted values)" — applied as
      `style.width`.
    All three are reactive: editing them in the Creator updates the
    preview live via `registerFunctionOnPropertyValueChanged`.
  - **No upload, no drag-and-drop**: because the question type does not
    inherit from `image`, there is no native upload UI ever. The empty
    state shows the `<video>` element placeholder and the configuration
    error banner — URL is the only way to point at a file.
  - **Toolbox icon**: a video-camera SVG is registered via
    `SurveyCreator.SvgRegistry.registerIconFromSvg` when available; if the
    current Creator build does not expose `SvgRegistry`, the widget falls
    back to the always-present built-in `icon-image`. The resolved name is
    handed to `8_survey.js` via `window.__videoSegmentIconName`.
  - **Question-type display name** localized to "Video Segment" by writing
    `qt.videosegment` (lowercase key — SurveyJS' Serializer lowercases
    every registered class name internally) into every locale of
    `Survey.surveyLocalization`, `SurveyCreator.editorLocalization` and
    `SurveyCreator.localization` (the namespace varies between
    survey-creator-knockout builds), so the question card dropdown no
    longer shows the unreadable lowercase `"videosegment"`.
  - All `getType()` comparisons in the widget, the toolbox refinement and
    the cross-field validator use the lowercased canonical type
    `"videosegment"`. Comparing against the camelCase `"videoSegment"`
    silently never matched (because SurveyJS internally lowercases the
    name), which previously caused the question card to render an empty
    `<div>` with the title visible but no video player.
  - **Root-relative URL support**: `videoUrl` now accepts paths like
    `/assets/video.mp4`. They are resolved against
    `window.SELFHELP_BASE_PATH`, which is exposed from the PHP `BASE_PATH`
    constant via `SurveyJSView::output_content()` (`survey_fields.base_path`
    in the `data-survey-js-fields` attribute) and read by `4_surveyJS.js`
    before survey rendering. Absolute (`https://`), protocol-relative
    (`//cdn...`), `data:` and `blob:` URLs are passed through unchanged.
  - Playback always begins at `startTimestamp`; the user can pause, resume
    and seek freely **within** `[startTimestamp, endTimestamp]`. Seeks
    outside the window are immediately clamped via the `seeking` / `seeked`
    handlers, so the timeline scrubber cannot rewind past the start or
    fast-forward past the end.
  - Playback is hard-stopped at `endTimestamp` (clamped + paused) and on
    replay restarts from `startTimestamp` (handled in the `play` event).
  - Configuration validation: missing URL/timestamps, negative values, and
    `startTimestamp >= endTimestamp` are reported in both the Survey Creator
    property panel (single-field via `isRequired`/`minValue`, cross-field
    via `onPropertyValidationCustomError`) and at runtime as a visible
    question error banner.
  - **Continuous playback tracking**: the question value is updated on
    every meaningful playback event (`play`, `pause`, `seek`, `clamp`,
    `ended`), not only when the segment finishes. The schema is:
    ```jsonc
    {
        "watched":        boolean,
        "currentTime":    number,
        "startTimestamp": number,
        "endTimestamp":   number,
        "duration":       number,
        "watchedSeconds": number,   // wall-clock seconds actually played, seeks excluded
        "percentWatched": number,   // 0..1
        "startedAt":      string,   // ISO of first play
        "lastUpdatedAt":  string,   // ISO of last event
        "lastEvent":      "play"|"pause"|"seek"|"clamp"|"ended",
        "completedAt":    string|null
    }
    ```
    A submission made while the participant was still partway through the
    segment now contains an accurate snapshot of where they stopped and
    what they did last. A per-event log was intentionally **not** added —
    the cumulative snapshot is enough for current analytics needs and a
    per-event array would needlessly inflate every survey response.
    `defaultValue` and `correctAnswer` are hidden from the property panel
    since the value is auto-generated.
  - **BASE_PATH wiring also added to the Creator preview**: the runtime
    view (`SurveyJSView`) already exposed `BASE_PATH` via
    `data-survey-js-fields` for `4_surveyJS.js` to consume. The Creator
    preview never loaded `4_surveyJS.js`, so root-relative `videoUrl`
    values like `/assets/intro.mp4` resolved against the host root and
    404ed. The Creator's container (`tpl_moduleSurveyCreatorJS.php`) now
    carries a `data-base-path` attribute populated from the PHP
    `BASE_PATH` constant, and `8_survey.js → initSurveyCreator()` reads
    it via `attr("data-base-path")` (not `.data()` — jQuery's `.data()`
    auto-coerces values that look like JSON / numbers) and assigns
    `window.SELFHELP_BASE_PATH`.
  - Removed the on-screen "Playback restricted to X.XXs – Y.YYs" hint
    text below the player; the segment boundaries are already implied by
    the timeline, and the hint cluttered the UI.
  - See [`docs/VIDEO_SEGMENT.md`](docs/VIDEO_SEGMENT.md) and the example at
    [`docs/examples/video-segment-example.json`](docs/examples/video-segment-example.json).
- New CSS file `server/component/style/surveyJS/css/video-segment.css`
  - Picked up by the existing gulp `styles` task (matches the
    `server/component/style/**/css/*.css` glob) and bundled into
    `css/ext/survey-js.min.css`.
  - Also added to the `DEBUG` CSS include lists in both
    `SurveyJSView::get_css_includes()` (runtime) and
    `ModuleSurveyJSView::get_css_includes()` (Creator) so it loads on the
    development environment without needing the gulp bundle.
- Added survey usage documentation: [`docs/SURVEY_USAGE.md`](docs/SURVEY_USAGE.md).
- Compatible with SurveyJS v1.9.124 (no library upgrade).

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
