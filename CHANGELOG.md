# SurveyJS Plugin Changelog

## Unreleased

## v1.7.0

SurveyJS libraries upgraded to **v3.0.2**. Survey Creator Dashboard now renders through Chart.js; Plotly is no longer shipped.

### Library / runtime
- Bump `survey-core`, `survey-js-ui`, `survey-creator-core`, `survey-creator-js`, `survey-analytics` and `survey-pdf` to **3.0.2**.
- Dashboard: the default `survey-analytics` v3 bundle renders through **Chart.js 4.5.1** (+ `chartjs-plugin-datalabels` 2.2.0) instead of Plotly. `plotly-latest.min.js` (4.5 MB) is removed from the package; Chart.js is 208 KB.
- Dashboard: `new SurveyAnalytics.VisualizationPanel(questions, data, options)` replaced by `new SurveyAnalytics.Dashboard({ questions, data, ... })`. `Dashboard` extends `VisualizationPanel`, so the existing `state` / `onStateChanged` localStorage persistence and `layout()` call are unchanged.
- Bump jsPDF to **4.2.1** and `jspdf-autotable` to **5.0.8** (`survey-pdf` v3 accepts jsPDF `^2 || ^3 || ^4`).
- Bump Tabulator to **6.5.2**.
- The Creator still runs on Preact: `survey-creator-js` v3 lists react/react-dom/survey-react-ui as UMD dependencies, but only on its CommonJS/AMD branch. Its browser-global branch resolves all three from `window.SurveyUI`, which `survey-js-ui` provides. No React is loaded.
- Refresh `survey-core`, `survey-creator-core`, `survey-analytics` and Tabulator CSS from the 3.0.2 packages.
- Set a per-instance `elementIdPrefix` when rendering surveys. In v2 element ids came from one global counter, so multiple surveys on a page got unique input ids; in v3 each survey instance restarts its own counter and two surveys emitted identical ids (`sq_0i_0`, `sq_1i`, ...). Pages with more than one surveyJS section are affected.
- Construct the Survey Creator on DOM ready instead of at script parse time. The v3 Creator initialises its theme variables in the constructor by appending a probe element to `document.body` to read computed styles; the Creator script loads in `<head>`, where `document.body` is still null, so the constructor threw `Cannot read properties of null (reading 'appendChild')` and the Creator never rendered.

### Notes
- v3 deprecates the `--sjs-` CSS variable prefix in favour of `--sjs2-`, but maps the old names internally, so existing custom CSS keeps working.
- v3 changes navigation buttons from `<input type="button">` to `<button>` with a nested `<span>`. The plugin defines no `sd-btn` selectors, so no CSS changes were needed.

### After update
- Run `server/db/v1.7.0.sql`.
- Clear CMS / styles / hooks cache.
- Rebuild CSS with gulp if you customize styles (`css/ext/survey-js.min.css`).

### Fixes
- Viewing a saved survey version no longer fails with "Corrupted version!". The versions table carried the survey JSON as raw text in a (hidden) table cell, so the browser parsed the markup inside question texts and descriptions (`<p>`, `<b>`, ...) as real HTML: unclosed tags were closed, `<`/`>` in the remaining text were re-escaped to `&lt;`/`&gt;`, and the string DataTables read back was no longer valid JSON. `JSON.parse` threw and the catch-all reported the version as corrupted — the stored data was always fine. Any survey containing markup was affected (9 of 10 versions in a local database); only markup-free surveys opened. The cell now carries the config base64-encoded and `surveyVersions.js` decodes it as UTF-8 before parsing, which round-trips unchanged and also stops the config from being injected into the page as HTML. Because the page markup and that script now share an encoding contract, the script is included with a `?v=<filemtime>` cache key so a browser holding the previous copy refetches it instead of feeding the encoded value to `JSON.parse`.
- The version preview no longer shows raw markup (`<p>`, `<b>`, ...) in question titles and descriptions authored with the rich text editor. SurveyJS escapes text by default; the viewer now registers the same `onTextMarkdown` hook the survey renderer applies through `applyHtml()`, so the content renders formatted.
- Expired sessions no longer surface as a bare "Data not saved!" alert (#22). When a save comes back as the rendered `no_access_guest` page (HTML, HTTP 200) instead of the controller's JSON — or as a 401/403 — the survey now reports that the session expired and sends the user to the login page. Genuine save failures still show the original error. Post-login return relies on core's `$_SESSION['target_url']`, so the user lands back on the survey.

## v1.7.0

### New feature
- `update_based_on` on the `surveyJS` style: names the column that identifies a response row. Empty (the default) keeps the existing behaviour, rows keyed on the generated `response_id`, one row per submission. Set to a column name, the survey updates the row already holding that value, so several components sharing a `survey_generated_id` build one row together, for example a questionnaire split across pages or a survey chained with a `labJS` experiment. A key matching no row falls back to the default rather than inserting, because the key is often a question answered part way through and inserting then would abandon the row already opened. A keyed survey reaching `started` again updates the row it already has for that `response_id` instead of opening a second one.
- The keyed column must identify one participant on its own. With guest participants every write shares a user, so a value repeated across people would merge them into one row.
- `url_params` now also exposes route parameters, not only the query string, so a value carried in the URL path reaches the survey. A query parameter still wins on a name clash.

## v1.6.0

SurveyJS libraries upgraded to **v2.5.28** (Preact / survey-js-ui). Knockout is no longer loaded.

### Library / runtime
- Swap runtime and Creator bundles to SurveyJS 2.5.28; load `survey-core` + `survey-js-ui` + `survey-creator-js` (Preact). Knockout is not loaded.
- Vendor filenames match packages: `3_survey-js-ui.min.js`, `5_survey-creator-js.min.js`, `1_survey-js-ui.min.js` (replaced legacy `*-knockout*` / `survey.jquery` names).
- Replace v1 theme CSS (`modern` / `defaultV2`) with `survey-core.min.css`.
- Bump `survey-pdf` to 2.5.28; refresh license key.
- Creator: `autoSaveEnabled` (replaces deprecated `isAutoSave`); render via `creator.render()`.
- Remove CMS `survey-js-theme` (v2 theming is CSS-only; `StylesManager.applyTheme` is gone), including `fields` / `fieldType` / section translations / lookups.
- Fix Versions viewer includes to use `survey-core` CSS/JS (was still on deleted `defaultV2`).
- Drop unused `1_knockout-latest.js` from the package.
- Dashboard: bump `survey-analytics` (+ tabulator adapter) to **2.5.28**, Tabulator **6.5.2**, Plotly **2.35.3** (were still on analytics/tabulator/plotly 1.9.x / 4.x / 1.x).

### Product
- CMS survey select lists **published** surveys only; field help text updated.
- Admin survey table shows **Published** and **Pending Changes**.
- CSP `media-src` allows `https:` for external survey videos (directive rewritten cleanly so `https:` cannot glue onto the next directive).
- Video watch gate no longer unsets completion after rewind/replay.
- Fix Publish/Delete when survey title is a plain string or missing (`title.default` threw).
- `redirect_at_end` supports `{{questionName}}` templates filled client-side from submitted survey data (e.g. `test/{{code}}`); plain page keywords still use `get_link_url`.

### After update
- Run `server/db/v1.6.0.sql`.
- Clear CMS / styles / hooks cache.
- Rebuild CSS with gulp if you customize styles (`css/ext/survey-js.min.css`).

## v1.5.0

### New: `gpxMap` style

A new standalone SelfHelp style called **`gpxMap`** that renders a
Leaflet/OpenStreetMap route preview from a list of GPX sample
points — outside the SurveyJS runtime. Drop the style into any
page or section to show a saved GPX route the same way the
`gpx` SurveyJS question's preview does, with full control over
where the points come from.

#### Default fields

Every `gpxMap` section exposes the standard SelfHelp internal
configuration fields:

- `debug` — render the section's debug pane when checked.
- `data_config` (JSON) — optional. Pull data from any source the
  data-config builder supports and expose the loaded keys to
  every field on the section via `{{var}}` interpolation. Letting
  designers populate `sample_points` dynamically from a dataTable
  row, a previous GPX upload answer or any other source the
  builder knows how to query.
- `condition` (JSON) — JSON-logic condition that gates rendering.
- `css` / `css_mobile` — extra CSS classes for the wrapper.

#### `sample_points` field

The route data feeds in through one new internal field:

- `sample_points` (JSON, internal / `display = 0`) — the array of
  `[lat, lon, ele?, distanceFromStartM?]` tuples that drives the
  polyline + start/end markers. **Accepts either**:
  1. A hard-coded JSON array typed directly into the field
     (`[[47.1234, 8.5678], [47.1240, 8.5685], …]`).
  2. A `data_config`-driven interpolation that resolves to such
     an array — e.g. `{{sampled_points}}` after `data_config`
     loaded the corresponding column.
  3. A full GPX answer payload (`{ name, time, sampledPoints,
     … }`) — the renderer auto-extracts the `sampledPoints`
     array so you can interpolate a whole `gpx` question answer
     row without unwrapping it first.

#### What you get on the page

- A Leaflet container the full width of the section.
- An OpenStreetMap base layer (`https://{s}.tile.openstreetmap.org/…`).
- A blue polyline through all sample points (same colour /
  thickness as the GPX question preview).
- Start and End markers with tooltips.
- `fitBounds` framing of the route.

#### What you write in the CMS

Hardcoded points example (everything on the section, no
`data_config` needed):

```json
[[47.1234, 8.5678], [47.1240, 8.5685], [47.1255, 8.5700]]
```

Dynamic example with `data_config`:

- `data_config` queries the `route_uploads` data table and pulls
  the `gpx_route` column.
- `sample_points` is set to `{{gpx_route}}`.
- At render time the framework substitutes the full GPX answer
  object; the renderer extracts `sampledPoints` automatically.

#### Bundle / installation

- The style ships with its own JS + CSS at
  `server/component/style/gpxMap/js/gpx-map.js` and
  `server/component/style/gpxMap/css/gpx-map.css`. Both are
  picked up by `gulp/gulpfile.js` and bundled into
  `css/ext/survey-js.min.css` next to the existing GPX question
  styles.
- The map renderer reuses the **vendored Leaflet 1.9.4** assets
  already shipped with the plugin
  (`server/component/style/surveyJS/js/6_leaflet.js`,
  `server/component/style/surveyJS/css/leaflet.css`). No new CDN
  fetch or external dependency.
- The new style + its `sample_points` field are registered by
  `server/db/v1.5.0.sql`.

### GPX question — UX polish

Follow-up to the v1.4.11 GPX question release based on designer
feedback. No data-contract changes — surveys created on v1.4.11
continue to load and submit identically; only the on-screen
presentation of the question changes.

- **Map takes the full row width; stats stack underneath.** The
  preview layout switched from a two-column "map left / stats
  right" grid to a single column with the Leaflet map on top and
  the metadata table below. The map is now ~2× wider on a typical
  question card, which makes the route polyline easier to inspect,
  and the stats table no longer fights the map for horizontal
  space on narrow screens.
- **Time row displays the date only (`DD-MM-YYYY`).** The GPX
  metadata `<time>` is typically a full ISO timestamp such as
  `2024-09-29T13:42:00Z`, which truncated awkwardly in the stats
  table. The stats panel now renders just the date portion
  (`29-09-2024`). **The persisted answer is unchanged** — the
  question's `value.time` still stores the full original string so
  analysts retain the time-of-day, timezone and seconds.
- **Action buttons match the SurveyJS theme + carry inline icons.**
  "Choose GPX file" and "Clear" now render with an inline SVG icon
  alongside their label and pick up colour, font and spacing from
  the active SurveyJS DefaultV2 theme variables
  (`--sjs-primary-backcolor`, `--sjs-special-red`, `--sjs-base-unit`,
  …) instead of the previous hand-tuned palette. The buttons read
  visually as part of the surrounding question rather than a
  bolted-on custom widget.
- **Button labels are translatable per locale.** Two new
  `isLocalizable: true` properties surface on every GPX question:
    - `chooseFileButtonText` — visible label + tooltip on the
      upload button.
    - `clearButtonText` — visible label + tooltip on the clear
      button.
  Both appear in the Creator's Translation tab next to `title` /
  `description`, so designers can fill in per-locale wording
  (`{ "default": "Choose GPX file", "de": "GPX-Datei wählen", … }`)
  without touching code. When the properties are left blank a
  built-in fallback table (en, de, fr, it) supplies a translated
  default keyed off `survey.locale`; an empty locale or one with
  no built-in entry falls back to English.
- **Live locale switching.** When the host page swaps
  `survey.locale` at runtime (e.g. a language picker on a
  multilingual survey) the button labels and tooltips update in
  place — no need to re-render the question.

## v1.4.11

### New: GPX question type

A new standalone SurveyJS custom question type called **GPX Route**
(toolbox label: *GPX Route*, type: `gpx`) for collecting hike / bike
route uploads in surveys. Pick it from the Creator toolbox like any
other question type.

#### What you can configure

In the question's property panel, under the **General** category:

- **Sampled point count** (`sampledPointCount`, default 100, min 2) —
  number of evenly-spaced points kept when downsampling the route for
  storage and preview. The full original `<trkpt>` count is recorded
  separately in the answer as `pointCountOriginal` so dashboards can
  still tell how detailed the source file was.

The standard SurveyJS title / required / visibility / logic properties
all apply. `defaultValue` and `correctAnswer` are hidden because the
answer is auto-generated from the uploaded file.

#### What participants experience

- A **Choose GPX file** button accepts a single `.gpx` upload. Files
  with any other extension are rejected client-side.
- The browser parses the GPX with `DOMParser`, flattens every
  `<trkpt>` across all `<trk>`/`<trkseg>` sections, and computes the
  total distance (haversine), elevation gain/loss, and hiking / biking
  duration estimates.
- An **OpenStreetMap basemap** preview renders immediately: a polyline
  through the sampled points, plus Start / End markers, with
  `fitBounds` framing the whole route.
- A summary panel shows the computed stats next to the map.
- A **Clear** button removes the parsed answer, the uploaded-file
  reference, and deletes the previously-uploaded `.gpx` from disk via
  a new safe backend action.
- Replacing the file deletes the previously-uploaded `.gpx` and
  uploads the new one before updating the answer.

#### What gets stored as the answer

The question fills **two fields** in the survey response:

1. The **main answer field** (`name` / `valueName`) stores the parsed
   route payload:

   ```json
   {
     "name": "Route name or null",
     "time": "metadata time or null",
     "totalDistanceKm": 12.34,
     "elevationGainM": 456,
     "elevationLossM": 321,
     "estimatedHikingTimeHours": 4.1,
     "estimatedBikingTimeHours": 1.8,
     "start": { "lat": 0, "lon": 0, "ele": 0, "distanceFromStartM": 0 },
     "end":   { "lat": 0, "lon": 0, "ele": 0, "distanceFromStartM": 12345 },
     "pointCountOriginal": 987,
     "sampledPointCount": 100,
     "sampledPoints": [[47.1, 8.5, 512, 0], ...]
   }
   ```

2. The **sibling file field** `<effectiveAnswerName>_file` (where
   `effectiveAnswerName` is `valueName` when set, otherwise `name`)
   stores upload-file metadata in the same shape SurveyJS' generic
   file question uses, so existing dashboard / review code renders it
   without any special-casing:

   ```json
   [
     {
       "name": "my-route.gpx",
       "type": "application/gpx+xml",
       "content": "?file_path=upload/<survey>/<response>/<code>/<question>/<file>"
     }
   ]
   ```

The dashboard table now renders any tabulator column whose field name
ends in `_file` as a clickable link to the stored file (`?file_path=…`
served through the existing download endpoint, with a new MIME mapping
of `.gpx → application/gpx+xml`).

#### Bundle / installation

- Re-run the plugin's gulp (`server/plugins/sh-shp-survey_js/gulp/`,
  `npx gulp`) to regenerate `css/ext/survey-js.min.css`. The Leaflet
  vendor CSS is **excluded** from the bundle and loaded standalone so
  its `url(images/...)` references resolve correctly relative to its
  on-disk location.
- Hard-refresh the Creator after pulling (Ctrl+Shift+R) to drop
  cached bundles.
- **No SQL migration required** — the question is implemented entirely
  in JS / CSS / controller code and stores its configuration inside
  the survey JSON, with answers persisted via the existing
  `user_input` pipeline.
- Vendored assets (`server/component/style/surveyJS/js/6_leaflet.js`,
  `.../css/leaflet.css`, `.../css/images/*`) are committed alongside
  the plugin — no CDN or external download required at runtime.

#### Where to read more

- [`docs/GPX_QUESTION.md`](docs/GPX_QUESTION.md) — full feature
  reference for the GPX question (property surface, value contract,
  upload / delete flow, CSP, dashboard link rendering).

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
