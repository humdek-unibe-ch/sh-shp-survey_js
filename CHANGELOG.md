# SurveyJS Plugin Changelog

## v1.4.10

### Improvements

- **Video question — auto-fit layout.** When you set only one of
  `videoHeight` or `videoWidth` (the common case for portrait phone
  clips that need a fixed height), the other dimension is now
  computed automatically from the video's natural aspect ratio, so
  you no longer get black pillarbox / letterbox bars unless you
  asked for them. Set both dimensions to keep the existing
  "stretch / letterbox" behaviour (designer is in charge); set
  neither to keep the responsive defaults; set just one to get a
  perfectly fitting box.

- **Video question — clean separation between read-only and
  required.** The two flags are now fully independent levers:
    - **`readOnly: true`** (per-question, in the JSON) hides the
      native controls and auto-starts playback so the participant
      can see the video without interacting (a "watch only" UX).
      This is opt-in per question — survey-level `mode: "display"`
      review pages keep the controls visible and respect
      `autoStart` at face value, so participants reviewing past
      answers can replay any video at their own pace.
    - **`isRequired: true`** blocks Next / Complete until the video
      has been watched all the way through (or to the end of the
      configured segment). The gate applies even when the question
      is also read-only, so saved values carrying `watched: true`
      sail through review pages while a brand-new question on a
      fresh page is held until playback completes.
    - **Both** combine: no controls AND must-watch-to-advance.

### Bug fixes

- **Video question — "Video URL is required" alert no longer sticks
  after you fill in the URL.** Adding a brand-new video question to
  a survey shows a configuration banner reminding you to set
  `videoUrl`. Previously the banner stayed visible after you typed
  in the URL, until you re-opened the question; now it clears as
  soon as a valid URL is entered. The same fix also makes the
  cross-field timestamp banner (`startTimestamp >= endTimestamp`)
  clear live as you adjust either field.

See [`docs/VIDEO_SEGMENT.md`](docs/VIDEO_SEGMENT.md) for the full
sizing + read-only behaviour reference.

## v1.4.9

### Bug fixes

- **Video question — review mode (`mode: "display"`) no longer
  silently auto-plays and hides controls.** v1.4.8 keyed the
  hide-controls + force-auto-start behaviour off the question's
  `isReadOnly` flag alone, which surprised designers using
  `survey.mode = "display"` to render past answers — that mode makes
  every question read-only, so every video on every review screen
  was starting on its own with no controls. The supervised-viewing
  UX is now keyed off **`isReadOnly` AND `isRequired` together**.
  Pure read-only (review mode, or a single read-only-but-not-
  required question) keeps the native controls visible, does NOT
  auto-start, and the required-watch hooks bow out entirely when
  `survey.mode === "display"` so review pages stay free to navigate.

- **Video question — Read-only + Required no longer skippable.**
  Previously, marking a video question as both `isReadOnly: true`
  and `isRequired: true` did NOT actually block the survey's Next /
  Complete buttons — participants could click straight through
  without watching. The required-watch validator was being silently
  skipped because SurveyJS' built-in `Question.hasErrors()` returns
  early for read-only questions, bypassing our per-question hook.
  Fixed by adding two extra survey-level hooks
  (`onCurrentPageChanging` and `onCompleting`) that check video
  questions explicitly, regardless of their read-only state, and
  block forward / complete actions until the video has been watched
  to the end of the configured segment (or to the file's natural
  end if no `endTimestamp` is set). Backward navigation is still
  allowed mid-watch.

- **Video question — playback data still recorded in supervised
  viewing.** Confirmed and documented: when the player's controls
  are hidden (supervised viewing), the widget continues to record
  the full playback metadata in the question's value (`watched`,
  `currentTime`, `watchedSeconds`, `percentWatched`, `startedAt`,
  `lastUpdatedAt`, `lastEvent`, `completedAt`, etc.). The
  read-only flag affects only the player's UI, not the
  data-recording path. No designer action required — the data
  captures itself.

See [`docs/VIDEO_SEGMENT.md → Read-only and required: two independent levers`](docs/VIDEO_SEGMENT.md#read-only-and-required-two-independent-levers)
for the full description and copy-paste-ready survey JSON for each
combination.

## v1.4.8

### New: video question type

A new SurveyJS question type called **Video** (toolbox label: *Video*,
icon: video camera) for embedding video content in surveys. Pick it
from the Creator toolbox like any other question type.

#### What you can configure

In the question's property panel, under the **General** category:

- **Video URL** — the video to play. Accepts:
  - Absolute URLs (`https://example.com/clip.mp4`)
  - SelfHelp-relative paths starting with `/` (`/assets/intro.mp4`) —
    automatically resolved against your CMS base path
  - `data:` and `blob:` URLs
- **Start timestamp / End timestamp** (both optional, in seconds) —
  restrict playback to a specific segment. Leave either or both blank
  to play the whole file. Seeking outside the segment is silently
  clamped back inside.
- **Auto-start playback when the question is shown** — begins playback
  automatically when the participant arrives on the question. Useful
  for one-video-per-page surveys.
- **Required-watch alert** — translatable message shown when the
  question is required and the participant tries to advance before
  finishing the video. Open the Creator's **Translation** tab to fill
  in per-locale wording, or leave blank to inherit the built-in
  English / German / French / Italian default.

Under the **Layout** category:

- **Video fit** (`contain` / `cover` / `fill` / `none`, default
  `contain`) — how the bitmap fills the player box.
- **Video height / Video width** — any CSS-accepted value (`300px`,
  `50vh`, `100%`, etc.). Leave blank for sensible defaults.

Every property has inline help text right below the input in the
Creator, so designers can pick the right value without looking
anything up.

#### What participants experience

- The player respects the configured segment: playback starts at
  `Start timestamp`, can't be scrubbed before it, hard-stops at
  `End timestamp`, and replays restart from the start.
- When the question is set to **Required**, the participant can't
  advance the survey until they've watched the segment all the way
  through. The "you must watch the whole video" alert is shown in
  whichever language the survey is in.
- When the question is set to **Read-only** (review / forced-watch
  display): the player's controls are hidden, and the video
  auto-starts on its own so the participant can watch but not
  scrub, pause, or skip. **Read-only + Required is the canonical
  "supervised viewing" recipe** — the participant must watch to
  completion, with no way to skip ahead, before they can continue.

#### What gets stored as the answer

The question's value is a structured object that updates continuously
as the participant interacts with the player — not just when they
finish. So even a survey submitted mid-playback has a meaningful
record of where the participant got to:

- `watched` — `true` once they've reached the end of the segment.
- `currentTime`, `startedAt`, `lastUpdatedAt`, `lastEvent` — last
  observed playback position and timing.
- `watchedSeconds`, `percentWatched` — actual viewing time, ignoring
  seeks.
- `duration`, `startTimestamp`, `endTimestamp` — echoed configuration
  for audit.

#### Bundle / installation

- Re-run the plugin's gulp (`server/plugins/sh-shp-survey_js/gulp/`,
  `npx gulp`) to regenerate `js/ext/surveyjs.min.js` and
  `css/ext/survey-js.min.css`. This is a separate gulp from the root
  SelfHelp gulp.
- Hard-refresh the Creator after pulling (Ctrl+Shift+R) to drop
  cached bundles.
- No SQL migration required — the question is implemented entirely in
  JS / CSS and stores its configuration inside the survey JSON.

#### Where to read more

- [`docs/VIDEO_SEGMENT.md`](docs/VIDEO_SEGMENT.md) — full feature
  reference for the video question (every property, every behaviour,
  the read-only + required recipe, the value schema, troubleshooting).
- [`docs/SURVEY_USAGE.md`](docs/SURVEY_USAGE.md) — how the new
  question fits into a SelfHelp survey end-to-end (locale wiring,
  base-path resolution, autoplay caveats).
- [`docs/examples/video-segment-example.json`](docs/examples/video-segment-example.json)
  — copy-paste-ready survey JSON covering the common patterns.

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
