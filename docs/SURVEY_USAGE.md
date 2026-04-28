# SurveyJS Plugin — Survey Usage Guide

This document is the user-facing guide for working with the SurveyJS plugin
(`sh-shp-survey_js`) in SelfHelp. It complements the
[plugin README](../README.md) and the dedicated guide for the
[Video question type](VIDEO_SEGMENT.md).

> All examples target **SurveyJS v1.9.124** (the version shipped with the
> plugin). Do not upgrade the SurveyJS library — the plugin and all custom
> question types are tested against this exact version.

---

## 1. Creating a survey

1. Log into SelfHelp as an administrator.
2. Navigate to the SurveyJS module page (typically
   `/<base>/moduleSurveyJSMode` — the keyword is `moduleSurveyJSMode`).
3. Click **Create New SurveyJS** in the side panel. A new survey row appears
   in the surveys table.
4. Click the row to open the survey in the **Survey Creator**.
5. Give the survey a title and a (lowercased, snake_case) name. The name is
   used as the dataTables `displayName` and for the `survey_generated_id`.

The Creator auto-saves every change. The status of the saved-but-not-yet
published version is shown above the editor (`Not published yet` or
`Published at: …`).

## 2. Adding questions

The Creator **toolbox** lists every available question type, including:

- The standard SurveyJS questions (text, checkbox, radio, dropdown, matrix,
  file, panel, ...)
- The **Rich Text Editor** (`quill`) custom question.
- The **Video** (`video`) custom question — see
  [VIDEO_SEGMENT.md](VIDEO_SEGMENT.md).

Drag any item from the toolbox onto a page, or click **Add Question** within
a page, then pick the type. Each question's properties are edited via the
right-hand **property panel**, grouped into categories (General, Logic,
Layout, ...).

### Adding the Video question

The **Video** question type is a standalone custom question. It accepts
URLs only — drag-and-drop and direct file upload are intentionally not
available.

1. Drag **Video** from the toolbox onto a page (look for the video-camera
   icon).
2. In the property panel set:
   - **Video URL** — full URL (`https://...`) or root-relative path
     (`/assets/video.mp4`, resolved against the SelfHelp `BASE_PATH`).
   - **Start timestamp (seconds, optional)** — playback start position.
     Leave blank to start at 0.
   - **End timestamp (seconds, optional)** — segment hard-stop. Leave
     blank (or `0`) to play the whole file.
3. Optionally tweak the layout (the **Layout** category in the property panel):
   - **Video fit** — `none` / `contain` / `cover` / `fill`. Applied to the
     `<video>` element via `object-fit`. Default: `contain`.
   - **Video height (CSS-accepted values)** — e.g. `360px`, `30vh`, `auto`.
   - **Video width (CSS-accepted values)** — e.g. `100%`, `640px`.
4. Optionally toggle **Required** so the participant has to watch (i.e.
   the question's value must be set) before submitting.

The plugin validates configuration in two complementary ways:

- **Single-field validation** runs in the property panel — required
  fields are marked, negative values are rejected (`minValue: 0` on
  both timestamps).
- **Cross-field validation** (URL required, `startTimestamp <
  endTimestamp`) is enforced as a question-level red banner above the
  live preview / runtime player, NOT as a per-property error in the
  property panel. Per-property cross-field errors latch on the
  not-currently-edited side and never clear, so we surface
  configuration mistakes on the question itself instead. See
  [VIDEO_SEGMENT.md → Validation](VIDEO_SEGMENT.md#validation) for
  details.

When the question is `isRequired`, the participant must additionally
watch to the configured `endTimestamp` (or the file's natural end if
no `endTimestamp` is set) before the survey lets them advance. The
alert text comes from the question's `requiredWatchMessage` property,
which is **fully translatable**: it is registered with
`isLocalizable: true` and appears in the Creator's **Translation tab**
under each video question, with one column per language defined in
*Language Settings* — fill in the German / French / etc. translation
right next to the question's `title`. If the property is left blank in
every locale, the widget falls back to a built-in translation table
indexed by `survey.locale` (currently bundled: `en`, `de`, `fr`, `it`)
and finally to the English default. See
[VIDEO_SEGMENT.md → Translatable required-watch alert](VIDEO_SEGMENT.md#translatable-required-watch-alert).

For "one-video-per-page" surveys, toggle the **`autoStart`** property
on the video question and the widget will automatically begin playback
when the participant navigates to that page (via the survey's Next
button, for example). Browser autoplay policies still apply — on a
freshly-opened first page with no prior user gesture the browser may
silently block the play attempt, in which case the participant sees a
paused player and clicks play manually. `autoStart` is suppressed in
read-only mode and in the Creator's Designer tab (use the **Test** tab
to verify autoplay during design). See
[VIDEO_SEGMENT.md → Auto-start playback](VIDEO_SEGMENT.md#auto-start-playback-autostart)
for the full discussion.

> The question's value is an auto-generated playback metadata object
> (continuous snapshot of `watched`, `currentTime`, `lastEvent`, etc.;
> see [VIDEO_SEGMENT.md → Question value](VIDEO_SEGMENT.md#question-value)
> for the full schema), not user input. The `defaultValue` and
> `correctAnswer` editors are hidden from the property panel because
> setting them by hand would not have a meaningful effect.

## 3. Survey lifecycle

### 3.1 Saving (auto-save)

Every change you make in the Creator is auto-saved to the database. The
plugin sends the survey JSON via AJAX to the same URL; the server stores it
as the **draft** version of the survey. The publish button becomes enabled
the moment the draft differs from the published version.

### 3.2 Publishing

1. Click **Publish** in the toolbar.
2. Confirm in the modal dialog.
3. The new version becomes live. Existing in-progress responses keep using
   the survey JSON they were started with (versioned via the `surveys_versions`
   table).

### 3.3 Versioning

All published versions are kept in `surveys_versions`. View / restore them via
the **Versions** button on the survey edit page.

### 3.4 Deletion

The **Delete Survey** button (red, top-right) requires you to type the survey
name to confirm. It is destructive and removes both the survey and all
collected responses. There is no undo.

## 4. Configuring how the survey appears on a page

A survey is rendered using the `surveyJS` style. Add it to any SelfHelp page
section and configure its fields:

| Field                       | Purpose                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `survey-js`                 | The survey to render (selected from the dropdown of all available surveys).              |
| `survey-js-theme`           | Visual theme (e.g. `defaultV2`, `modern`).                                               |
| `restart_on_refresh`        | If `1`, refreshing the page starts a new attempt; if `0`, restores the in-progress one.  |
| `redirect_at_end`           | URL to redirect to after submission.                                                     |
| `auto_save_interval`        | Auto-save in-progress responses every N seconds (`0` to disable).                        |
| `timeout`                   | Survey expiry, in minutes since start. `0` means no timeout.                             |
| `url_params`                | If set, query-string params are forwarded into the survey as `extra_param_*` values.     |
| `save_pdf`                  | If `1`, adds a "Save as PDF" navigation button.                                          |
| `own_entries_only`          | If `1` (default), users can only edit their own responses in edit mode.                  |
| `dynamic_replacement`       | A JSON template that overrides the dropdown selection for advanced dynamic content.      |
| `label_survey_done`         | Markdown shown when the survey has already been completed.                               |
| `label_survey_not_active`   | Markdown shown when the survey is outside its active window.                             |

These are the same fields documented in the main [README](../README.md).

## 5. Testing surveys locally

Because every change is auto-saved, the fastest test workflow is:

1. Open the Survey Creator in one tab.
2. Open the SelfHelp page that hosts the `surveyJS` style (with the survey
   selected) in another tab.
3. After every change, **publish** the survey, then refresh the runtime tab.
   In-progress sessions are restored from the database (`restart_on_refresh = 0`)
   so you can test continuation behaviour as well.

For the **Video** question type, recommended manual checks:

| Check | Expected outcome |
|-------|------------------|
| Open the survey for the first time. | The video preloads metadata and seeks to `startTimestamp`. |
| Press play. | Playback starts at `startTimestamp`. |
| Drag the playhead before `startTimestamp`. | Playhead snaps back to `startTimestamp`. |
| Drag the playhead past `endTimestamp`. | Playhead snaps to `endTimestamp` and pauses. The question's value is `{ watched: true, ... }`. |
| Let the video play through naturally. | At `endTimestamp` the video pauses; the value is updated. |
| Press play again. | Playback restarts at `startTimestamp`. |
| Set `endTimestamp <= startTimestamp` in the JSON manually. | The Creator's property panel and the runtime question both display the validation error. |

## 6. Exporting and importing survey JSON

### Export

In the Survey Creator click the **JSON** tab to view the full survey JSON.
Copy the contents to a file (or drag it into the `dynamic_replacement` field
of another survey for advanced templating).

The plugin also keeps every published version in `surveys_versions`; you can
download earlier versions through the **Versions** module page.

### Import

1. Open or create a survey in the Creator.
2. Switch to the **JSON** tab.
3. Replace the JSON with the imported content.
4. Switch back to the **Designer** tab. Auto-save will pick up the change and
   send it to the database.
5. Click **Publish** to make the imported survey live.

Custom question types (`video`, `quill`) survive export/import as long
as the importing instance also runs plugin v1.4.8 or later — the type
names (`type: "video"`) and property names are stable.

## 7. Troubleshooting

| Problem | Resolution |
|---------|------------|
| Toolbox does not show **Video** | The Creator page was opened before the v1.4.8 deploy. Hard-refresh (`Ctrl+Shift+R`). |
| Survey does not save | Check the browser console for HTTP 401/403; your session may have expired (the plugin shows a modal in this case). Re-login. |
| Property panel red borders | A required property (only `videoUrl` is required) is empty or violates `minValue`/cross-field rules. Hover the field to read the error. |
| Mobile playback never starts | iOS/Android block autoplay — the user must manually press play. The widget never autoplays by design. |
| `media-src` blocked errors in the browser console | Verify the page is configured under SurveyJS Hooks' CSP — pages containing the `surveyJS` style automatically receive a relaxed `media-src` directive. |

For deeper questions on the Video question type specifically see
[VIDEO_SEGMENT.md](VIDEO_SEGMENT.md). (Doc file name kept on disk for
stable links from older notes; the document is the reference for the
`video` question.)
