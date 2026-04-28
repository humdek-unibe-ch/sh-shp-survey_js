# Video Question Type (`video`)

> **File-name note** — this document is named `VIDEO_SEGMENT.md` for
> historical reasons (the question went through several internal names
> while it was being designed). The doc file is kept under that name on
> disk so older notes / links continue to resolve. The question type
> itself is `video`.

Custom SurveyJS question that plays an HTML5 video. By default the user
watches the entire file; survey designers can optionally restrict
playback to a `[startTimestamp, endTimestamp]` window. Introduced in
**plugin v1.4.8**.

## Purpose

Many studies and training surveys need participants to watch a **video
clip** before answering, sometimes a specific excerpt of a longer file.
Doing this with a plain `<video>` element, or by extending the SurveyJS
`image` question (which supports `contentMode: "video"` but plays the
whole file with no progress reporting), requires custom JavaScript per
survey and is brittle. The `video` question type encapsulates that
behaviour as a first-class custom question:

- The participant either watches the **whole file** (no timestamps set)
  or a **bounded segment** (one or both timestamps set).
- When both timestamps are set, the participant cannot play before
  `startTimestamp`, cannot watch past `endTimestamp`, and replays
  always restart at `startTimestamp`. Both natural playback and
  timeline-scrubber seeks are clamped.
- The question records playback metadata so dashboards / analytics can
  tell whether the participant actually finished the video, where they
  stopped, and how much they watched.
- The Creator UI is intentionally minimal — `videoUrl` is the only
  required field, optional `startTimestamp` / `endTimestamp` enable
  segment enforcement, and `videoFit` / `videoHeight` / `videoWidth`
  are applied directly to the `<video>` element.

## Compatibility

| Item               | Version       |
| ------------------ | ------------- |
| SurveyJS           | **1.9.124**   |
| SelfHelp           | v7.3.1+       |
| Plugin             | **v1.4.8**+   |
| Browser            | Any modern browser supporting HTML5 `<video>` (Chrome, Firefox, Safari, Edge) |

The plugin **must remain on SurveyJS v1.9.124**; do not upgrade the SurveyJS
library. The implementation only uses public v1.9.x APIs:

- `Survey.Serializer.addClass(name, props, null, "empty")`
- `Survey.ElementFactory.Instance.registerCustomQuestion`
- `Survey.CustomWidgetCollection.Instance.addCustomWidget`
- `Survey.surveyLocalization` / `SurveyCreator.editorLocalization` /
  `SurveyCreator.localization`
- `SurveyCreator.SvgRegistry.registerIconFromSvg` (with graceful fallback
  to the built-in `icon-image` when the registry isn't exposed in this
  build)
- `creator.onShowingProperty` (used to hide `defaultValue` /
  `correctAnswer` from the property panel — the question's value is
  auto-generated playback metadata)
- `survey.onValidateQuestion` (used to require a complete watch when
  the question has `isRequired: true`)

## Architecture

The question type is a **standalone class** with parent `"empty"`, **not**
an extension of the built-in `image` question:

```js
Survey.Serializer.addClass(
    "video",
    [
        { name: "videoUrl:string",       isRequired: true, displayName: "Video URL" },
        { name: "startTimestamp:number", minValue: 0 },                      // optional, no default
        { name: "endTimestamp:number",   minValue: 0 },                      // optional, no default
        { name: "videoFit",   default: "contain", choices: ["none","contain","cover","fill"] },
        { name: "videoHeight:string", default: "" },
        { name: "videoWidth:string",  default: "" }
    ],
    null,
    "empty"   // <-- standalone, NOT "image"
);
```

> **About the type case** — SurveyJS v1.9.124 internally lowercases every
> class name in `Survey.Serializer.addClass(name, ...)` (the
> implementation does `name = name.toLowerCase()` before storing the
> class). The canonical type therefore is **`video`**, all lowercase, and
> that is what `question.getType()` returns at runtime regardless of the
> case the survey JSON happens to use. We rely on
> `Survey.surveyLocalization.locales[loc].qt.video = "Video"` to give it
> a pretty user-facing label. Compare types case-insensitively (or
> against the lowercased form) in any custom code that branches on
> `getType()`.

### Why standalone, not `image`?

An earlier iteration extended the `image` question. That broke things:

1. The image question's native renderer rendered the question instead of
   our custom widget, so segment clamping was never applied — the full
   video played even when both timestamps were set.
2. The image renderer used `imageLink` as-is, bypassing our
   `resolveVideoUrl()` helper, so SelfHelp-relative paths like
   `/assets/video.mp4` were not prefixed with `BASE_PATH` and produced
   404s when SelfHelp was mounted at a sub-path (e.g. `/selfhelp`).
3. The image renderer's "no value" placeholder offered drag-and-drop
   file upload, which is exactly the affordance we need to forbid.

By inheriting from `empty`, the custom widget's `htmlTemplate` is the
sole source of truth and all of those problems disappear.

### Layout properties — really applied

`videoFit`, `videoHeight` and `videoWidth` aren't just metadata; the
widget applies them directly to the `<video>` element via inline styles:

| Property      | Effect                                  |
| ------------- | --------------------------------------- |
| `videoFit`    | `style.objectFit` (default `contain`)   |
| `videoHeight` | `style.height` (any CSS length string)  |
| `videoWidth`  | `style.width`  (any CSS length string)  |

They are also wired up via `registerFunctionOnPropertyValueChanged` so
editing them in the Creator updates the preview live without a reload.

## Installation

The question is bundled with the SurveyJS plugin. Once you are running
plugin **v1.4.8+** there is nothing extra to install — the widget is
registered automatically the first time a survey page loads.

If you are upgrading from a previous version:

1. Pull the latest plugin code into `server/plugins/sh-shp-survey_js`.
2. From `gulp/`, run `npx gulp` to rebuild `css/ext/survey-js.min.css`.
   The CSS file `server/component/style/surveyJS/css/video-segment.css`
   (file name kept on disk for git-history continuity) is matched by
   the existing `server/component/style/**/css/*.css` glob and gets
   concatenated into the production bundle automatically.
3. Hard-refresh your browser (the SurveyJS Creator caches static assets).

No SQL migration is required: the question is implemented entirely in
JS/CSS and stores its configuration inside the SurveyJS JSON.

### CSS loading paths

| Mode          | How the CSS is loaded                                           |
| ------------- | --------------------------------------------------------------- |
| Production    | Bundled by gulp into `css/ext/survey-js.min.css`.               |
| `DEBUG = 1`   | Loaded directly from `server/component/style/surveyJS/css/video-segment.css` by both `SurveyJSView` and `ModuleSurveyJSView`. |

## Property reference

| Property                | Type    | Required | Default       | Editor / display name                                                       |
| ----------------------- | ------- | -------- | ------------- | --------------------------------------------------------------------------- |
| `videoUrl`              | string  | yes      | `""`          | "Video URL"                                                                 |
| `startTimestamp`        | number  | no       | *(unset)*     | "Start timestamp (seconds, optional)"                                       |
| `endTimestamp`          | number  | no       | *(unset)*     | "End timestamp (seconds, optional)"                                         |
| `autoStart`             | boolean | no       | `false`       | "Auto-start playback when the question is shown"                            |
| `videoFit`              | enum    | no       | `"contain"`   | "Video fit" — `none`/`contain`/`cover`/`fill`                               |
| `videoHeight`           | string  | no       | `""`          | "Video height (CSS-accepted values)"                                        |
| `videoWidth`            | string  | no       | `""`          | "Video width (CSS-accepted values)"                                         |
| `requiredWatchMessage`  | text (localizable) | no | *(unset)* | "Required-watch alert (optional, falls back to localized default)"          |

`defaultValue` and `correctAnswer` are hidden from the property panel
because the value is auto-generated playback metadata; setting them by
hand would not have a meaningful effect.

> **Why no `default: 0` on either timestamp?** Setting a `default: 0`
> value causes the Creator's number editor to pre-fill `0` into the
> input as soon as the question is added from the toolbox. The
> cross-field validator then sees `start = 0`, `end = 0` and surfaces
> a spurious "startTimestamp must be strictly less than endTimestamp"
> error before the user has typed anything. Leaving the property
> defaults unset means both fields render blank, and the validator
> correctly treats them as "not configured".

### Optional timestamps — what each combination means

| `startTimestamp` | `endTimestamp` | Result                                                                 |
| ---------------- | -------------- | ---------------------------------------------------------------------- |
| unset / 0        | unset / 0      | Plays the full file. No clamping. Standard HTML5 player.               |
| set (> 0)        | unset / 0      | Skip-intro: playback begins at `startTimestamp`, runs to natural end.  |
| unset / 0        | set (> 0)      | Cap-trailer: playback runs from 0 up to `endTimestamp`, then pauses.   |
| set (> 0)        | set (> start)  | Strict segment: clamp both ends, hard-pause at end, replay snaps to start. |

`endTimestamp === 0` is treated identically to "unset", because a
0-second segment is nonsensical and we don't want a value of `0`
auto-rendered into a blank number editor to flip the question into
"misconfigured". Internally an unset / zero `endTimestamp` is treated
as `Infinity` until `loadedmetadata` fires, at which point it is
promoted to `video.duration`. All clamping branches are guarded with
`isFinite(end)` so the unbounded case is a no-op.

## Video URL resolution

`videoUrl` accepts several URL forms; resolution happens in
`5_videoSegmentWidget.js → resolveVideoUrl()`:

| Input                              | Resolved URL                              |
| ---------------------------------- | ----------------------------------------- |
| `https://cdn.example.com/clip.mp4` | unchanged                                 |
| `//cdn.example.com/clip.mp4`       | unchanged (protocol-relative)             |
| `data:video/mp4;base64,...`        | unchanged                                 |
| `blob:https://example.com/abcd`    | unchanged                                 |
| `/assets/clips/intro.mp4`          | `<BASE_PATH>/assets/clips/intro.mp4`      |
| `assets/clips/intro.mp4`           | unchanged (page-relative; browser resolves) |

`BASE_PATH` is the SelfHelp install prefix (PHP constant, e.g.
`/selfhelp`). It is exposed to JavaScript as `window.SELFHELP_BASE_PATH`:

- **Runtime** (`SurveyJSView::output_content()`) writes
  `survey_fields.base_path` into the `data-survey-js-fields` attribute.
  `4_surveyJS.js → initSurveyJS()` reads that attribute and sets
  `window.SELFHELP_BASE_PATH` **before** the survey is rendered.
- **Survey Creator preview** (`tpl_moduleSurveyCreatorJS.php`) writes
  `BASE_PATH` into the `data-base-path` attribute on `#surveyJSCreator`.
  `8_survey.js → initSurveyCreator()` reads that attribute via
  `attr("data-base-path")` (not `.data()` — jQuery's `.data()`
  auto-coerces values that look like JSON / numbers, which can mangle
  path-shaped strings) and assigns `window.SELFHELP_BASE_PATH` before
  the Creator renders.

If `window.SELFHELP_BASE_PATH` is empty or undefined, root-relative
URLs are returned unchanged and the browser resolves them against the
document host.

## Playback behaviour

The custom widget attaches handlers to the `<video>` element to enforce
the segment window when it's defined, and to track playback progress
in all cases:

| Event              | What it does                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loadedmetadata`   | If `endTimestamp` was unset, promote `end` to `video.duration` so percent-watched math works. Then seek to `startTimestamp`.                                       |
| `seeking`/`seeked` | If `currentTime < startTimestamp`, snap forward to `startTimestamp`. If both timestamps are set and `currentTime > endTimestamp`, snap back to `endTimestamp` and pause. |
| `timeupdate`       | Accumulate watched-seconds (only while playing inside the segment). When both timestamps are set and `currentTime ≥ endTimestamp`, snap to `endTimestamp` and pause. |
| `ended`            | Reset `currentTime` back to `startTimestamp` (replay starts at the segment beginning).                                                                              |
| `play`             | If the user presses play after reaching the end, snap back to `startTimestamp` first.                                                                              |
| `pause`            | Persist the latest playback state (so a user pause is reflected in the question value).                                                                            |

The native HTML5 `<video controls>` UI is shown — including the timeline
scrubber. The user is free to pause/resume and seek **inside** the
allowed window; seeks outside it are silently clamped. When no segment
is defined the UI behaves like a plain video player.

In **read-only** mode, native controls are hidden and the video cannot
be interacted with.

## Question value

The widget continuously updates the question's value as the participant
interacts with the player — **not** only when playback finishes. Every
play, pause, seek and end event triggers a value assignment, so a
survey that is submitted mid-playback still has a meaningful record of
where the participant got to and what they did last.

```jsonc
{
    "watched":        true,                       // true once currentTime ≥ end (or video ended)
    "currentTime":    32.4,                       // last observed currentTime, clamped into [start, end]
    "startTimestamp": 12,                         // echoed for audit
    "endTimestamp":   45,                         // resolved end (explicit value or video.duration). null until known.
    "duration":       33,                         // (end - start). null while end is undetermined.
    "watchedSeconds": 21.7,                       // total seconds the user actually watched (excludes seeks)
    "percentWatched": 0.658,                      // watchedSeconds / duration, capped at 1
    "startedAt":      "2026-04-28T11:31:50.000Z", // first time the user pressed play
    "lastUpdatedAt":  "2026-04-28T11:32:25.000Z", // wall-clock of the most recent event
    "lastEvent":      "pause",                    // "play" | "pause" | "seek" | "ended" | "clamp"
    "completedAt":    null                        // ISO 8601 once `watched` becomes true
}
```

| `lastEvent` value | Trigger                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| `play`            | Native `play` event (initial start, resume after pause, replay)          |
| `pause`           | Native `pause` event before reaching the end                             |
| `seek`            | Native `seeked` event with `currentTime` inside the allowed window       |
| `clamp`           | User tried to seek past `endTimestamp`; widget snapped them back and paused |
| `ended`           | `currentTime` reached `endTimestamp` (or natural end of file when unset) |

`watchedSeconds` measures wall-clock time spent actually playing inside
the segment — seeks contribute zero seconds (the watch-rate accumulator
is reset across a seek). Pause/resume cycles do not double-count.

> A per-event log was deliberately **not** included. The cumulative
> snapshot (`lastEvent`, `currentTime`, `watchedSeconds`, `completedAt`)
> already answers every analytics question the plugin needs today, and
> a per-event array would inflate every survey response without obvious
> benefit. If you need full event history, log it from a parent
> component via `survey.onValueChanged` instead of changing the
> question schema.

The schema is intentionally not editable in the Creator property panel;
`defaultValue` and `correctAnswer` are hidden because hand-set values
would not have a meaningful effect.

### Note on `endTimestamp` / `duration` being `null`

Before the user starts the video the recorded `endTimestamp` /
`duration` may be `null` if the segment end is undetermined (i.e. only
`startTimestamp` is set, or neither is set, and `loadedmetadata` has
not fired yet). Once metadata loads they reflect the resolved bound
(the explicit value, or the natural file duration). After playback
starts the values are stable.

## Validation

Configuration errors are reported as **question-level** alerts:

1. **Single-field non-negativity** is declared on the Serializer
   (`minValue: 0` on `startTimestamp` / `endTimestamp`). SurveyJS'
   built-in number editor handles this without any custom hook.
2. **Cross-field validation** (`startTimestamp < endTimestamp` and
   "videoUrl required") is enforced exclusively in the runtime
   widget's `afterRender`, surfaced as a red banner above the live
   preview / runtime player.

> **Why no `creator.onPropertyValidationCustomError`?** That hook only
> re-runs for the property currently being edited. An error message
> attached to the OTHER property is never cleared by subsequent valid
> edits and stays latched — we observed this manifest as `start=15` /
> `end=45` (clearly valid) still showing the cross-field error on both
> property fields, because earlier in the keystroke sequence the
> values had briefly satisfied `start >= end` and that error never got
> wiped from the property that wasn't the one currently being edited.
> Moving the cross-field rule to a question-level banner sidesteps the
> entire latching problem.

The runtime banner has **no** latching: the widget self-clears its
own question-level errors on every `afterRender` (errors it created
are tagged `__fromVideoQuestion`, so we never accidentally drop
unrelated errors set by SurveyJS' required-question validator or
other custom code) and re-evaluates `getConfigError` from scratch
each time.

Validated conditions:

- `videoUrl` is required and must be non-empty.
- If provided, `startTimestamp` and `endTimestamp` must be finite,
  non-negative numbers.
- The cross-field rule "`startTimestamp` strictly less than
  `endTimestamp`" only fires when **both** timestamps are *meaningful*
  — i.e. concrete numbers strictly greater than zero.

`null` / `undefined` / empty string / `0` on either timestamp are all
treated as "not configured": the user can clear either field at any
time without the property panel complaining, and the runtime widget
falls back to `start = 0` / `end = video.duration`.

### Required questions: enforce a complete watch

When the question is marked `isRequired: true`, the widget additionally
attaches a `survey.onValidateQuestion` hook that blocks survey
navigation / completion until `value.watched === true` — i.e. until
the participant has reached the configured `endTimestamp` (or the
file's natural end if no `endTimestamp` is set).

The error message is resolved through `getRequiredWatchMessage(q)`
(see [Translatable required-watch alert](#translatable-required-watch-alert)
below), so the alert respects both per-question custom strings and
the survey's active locale.

The hook is attached lazily on first `afterRender` and tagged on the
survey instance (`survey.__videoQuestionRequiredHookAttached`), so it
attaches once even if a survey contains multiple video questions.

This is necessary because SurveyJS' built-in `isRequired` check only
asks "is the value non-empty?". Our widget continuously persists
playback state to `question.value` from the very first
`loadedmetadata` snapshot, so by the time the user sees the player
there is already a value object in place and the stock check is
vacuously true.

As a safety net, an explicit `endTimestamp` greater than the actual
file duration is capped at `video.duration` on `loadedmetadata`.
Without that cap, a misconfigured upper bound would make `watched`
(which compares `currentTime >= end - 0.05`) impossible to satisfy and
a required question would be permanently un-passable.

### Auto-start playback (`autoStart`)

Set the `autoStart` property to `true` on the question to have the
widget call `video.play()` automatically once the metadata has loaded
and the player has snapped to `startTimestamp` (or `0`, if unset).
Useful for "one-video-per-page" surveys where the participant lands on
the page and the video should just start playing.

The autoplay attempt is suppressed in two situations:

1. **Read-only mode** (`question.isReadOnly === true`). When a survey
   is reloaded for review of a previously submitted answer, the video
   should not restart — the participant has already watched it.
2. **Creator Designer tab** (`survey.isDesignMode === true`). Otherwise
   every property edit would re-fire playback in the preview pane and
   overlap audio across multiple video questions in the same survey.
   Switch to the Creator's **Test** tab if you want to confirm the
   autoplay behaviour in a designer session.

The widget never mutes the video implicitly. **Browser autoplay
policies still apply**: most modern browsers block autoplay-with-sound
unless there has been a recent user gesture in the same tab. In
practice that means:

- On a video question reached via the survey's **Next** button (or any
  other click), `autoStart` works reliably — the click counts as the
  required user gesture.
- On the **very first page** of a directly-opened survey link (no
  prior gesture), the browser is likely to reject the `play()` call.
  The widget swallows the rejection silently; the user sees a paused
  player and clicks play themselves. The configuration error banner
  is **not** shown — autoplay being blocked is an expected,
  non-erroneous outcome.

If you absolutely need autoplay-with-sound on a directly-opened first
page, host the video on a survey page that's reached after at least
one click (e.g. an intro page with a "Start" button), or accept that
some browsers will block until the participant interacts.

### Translatable required-watch alert

The `requiredWatchMessage` property is registered with
`isLocalizable: true`, which means SurveyJS treats it the same way as
the question's built-in `title` / `description`:

1. **It appears in the Creator's Translation tab.** Designers open
   *Translation* and see a row labelled "Required-watch alert" under
   each video question, with one input column per language defined in
   *Language Settings*. Filling those in produces JSON like
   `"requiredWatchMessage": { "default": "…", "de": "…", "fr": "…" }`
   instead of a flat string.
2. **`question.requiredWatchMessage` already does locale resolution.**
   At runtime SurveyJS' `LocalizableString` returns the entry for
   `survey.locale`, falls back to the `default` locale entry if the
   active-locale entry is missing, and yields `""` when neither has
   been set in the Creator.

The widget then layers a built-in translation backstop on top:

1. **SurveyJS-resolved per-locale string** — if the designer filled in
   anything (Translation tab or property panel), the resolved value
   for the active locale is used as-is.
2. **Built-in translation for the active locale** — if
   `requiredWatchMessage` resolved to `""` (empty in every locale),
   the widget reads `survey.locale` and looks the message up in
   `DEFAULT_REQUIRED_WATCH_MESSAGES`. Bundled locales: `en`, `de`,
   `fr`, `it`.
3. **English default** — if no entry matches the active locale (or
   `survey.locale` is blank, the SurveyJS default state), the English
   message is shown.

The two layers compose cleanly: designers who care about exact wording
override per question via the Translation tab, designers who just want
"sane defaults" leave the property blank and inherit the bundled
translations. To add a locale to the built-in table, append one line
to `DEFAULT_REQUIRED_WATCH_MESSAGES` in `5_videoSegmentWidget.js`.

## Toolbox icon

The widget tries to register a video-camera SVG via
`SurveyCreator.SvgRegistry.registerIconFromSvg("video-question", ...)`.
If that registry is not exposed by this build of survey-creator-knockout,
the widget falls back to the built-in `icon-image`. The resolved icon
name is made available to `8_survey.js` through
`window.__videoQuestionIconName`.

## Question-type label

By default SurveyJS renders the question-type dropdown label as
`type.toLowerCase()`, which produces `"video"` — already readable, but
we still seed the `qt.video` entry of every locale in
`Survey.surveyLocalization`, `SurveyCreator.editorLocalization` and
`SurveyCreator.localization` with `"Video"` for consistency with the
plugin's other localization conventions and so the label survives any
case difference between builds.

## Usage examples

### 1. Plain video question (whole file)

```json
{
    "type": "video",
    "name": "intro_clip",
    "title": "Watch the introduction",
    "isRequired": true,
    "videoUrl": "/assets/clips/intro.mp4",
    "videoFit": "contain",
    "videoHeight": "360px"
}
```

### 2. Sub-segment enforcement

```json
{
    "type": "video",
    "name": "intro_clip",
    "title": "Watch the introduction (0:10 – 0:45)",
    "isRequired": true,
    "videoUrl": "/assets/clips/intro.mp4",
    "startTimestamp": 10,
    "endTimestamp": 45,
    "videoFit": "contain",
    "videoHeight": "360px"
}
```

The `type` is intentionally lowercase because SurveyJS internally
lowercases every registered class name (see *Architecture* above). Both
the toolbox button and any survey JSON exported from the Creator emit
`video`.

A complete example survey is in
[`docs/examples/video-segment-example.json`](examples/video-segment-example.json)
(file name kept on disk for stable links from older notes).

## Limitations

- The `<video>` element shows the **native** HTML5 player UI, including
  its full timeline. Seeks outside the segment are clamped, but the
  visual scrubber still spans the whole file.
- Browsers may refuse to autoplay videos with sound; if you need
  autoplay, set `muted` on the `<video>` element (currently you would
  do that by editing the widget's `htmlTemplate`).
- The configured timestamps are validated against each other, but not
  against the actual video duration. An `endTimestamp` greater than the
  file length is automatically capped at `video.duration` on
  `loadedmetadata` so `watched` (and therefore required-question
  validation) stays satisfiable.

## Troubleshooting

| Symptom                                                            | Likely cause / fix                                                                                                                                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `404` for `<host>/assets/video.mp4` when SelfHelp is at `/selfhelp` | `window.SELFHELP_BASE_PATH` not set. **Runtime**: confirm `4_surveyJS.js` runs before the survey renders and `data-survey-js-fields` is on `.selfHelp-survey-js-holder`. **Creator**: confirm `tpl_moduleSurveyCreatorJS.php` emits `data-base-path` and `8_survey.js` reads it via `attr()`. |
| Full video plays even though both timestamps are set                | Hard-refresh the browser to drop cached JS. Confirm both timestamps are numbers and that `endTimestamp > startTimestamp`.                                                         |
| Question card renders an empty `<div>` (no video, no error banner)  | Custom-widget `isFit()` is not matching. SurveyJS lowercases all class names; comparing `getType() === "Video"` (camelCase) silently never matches. The widget compares against `"video"`. Hard-refresh to drop cached JS. |
| Toolbox icon is empty                                               | Old cached JS or missing icon registration. The plugin falls back to `icon-image` automatically.                                                                                  |
| "startTimestamp must be strictly less than endTimestamp" appears in the Creator property panel for valid configurations (e.g. `start=15`, `end=45`) | A pre-release v1.4.8 widget hooked `creator.onPropertyValidationCustomError` for the cross-field rule. That event only re-runs for the property currently being edited, so an error attached to the OTHER property could never be cleared by subsequent valid edits and stayed latched. The shipped v1.4.8 widget moves cross-field validation to a question-level red banner (above the live preview / runtime player) which self-clears on every re-render. Hard-refresh to drop cached JS. |
| Cross-field error stays in the Creator preview banner after fix      | The widget self-clears errors tagged `__fromVideoQuestion` on every `afterRender`, but a re-render is only triggered on a property change. Click anywhere in the property panel (or change/restore any property) to force a re-render. |
| Required-watch alert appears in English on a German page             | `survey.locale` is empty (the SurveyJS default). Confirm `4_surveyJS.js` is reading the locale from the `selfHelp-locale-<locale>` class on `.selfHelp-survey-js-holder`. Either fill in the German entry in the Creator's Translation tab (`requiredWatchMessage` is `isLocalizable: true` and shows up there next to the question title), or rely on the built-in `de` backstop in `DEFAULT_REQUIRED_WATCH_MESSAGES`. |
| `requiredWatchMessage` row missing from the Translation tab          | Old cached JS — the property is registered with `isLocalizable: true` since v1.4.8. Hard-refresh the Creator (Ctrl+Shift+R) and reopen the survey. |
| "Video URL is required"                                              | Configuration error — fix the property value in the Creator.                                                                                                                      |

## Files of interest

| File                                                                            | Purpose                                                                                  |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `server/component/style/surveyJS/js/5_videoSegmentWidget.js`                    | Class definition for `video`, custom widget, URL resolver, playback enforcement, icon + localization. File name kept on disk for git-history continuity. |
| `server/component/style/surveyJS/css/video-segment.css`                         | Styles for the player and error banner (CSS classes prefixed `.sjs-video`).                |
| `server/component/style/surveyJS/SurveyJSView.php`                              | Runtime view — exposes `BASE_PATH` to JS via `data-survey-js-fields`.                    |
| `server/component/style/surveyJS/js/4_surveyJS.js`                              | Reads `BASE_PATH` and assigns `window.SELFHELP_BASE_PATH`.                               |
| `server/component/moduleSurveyJS/js/8_survey.js`                                | Toolbox refinement (icon, default JSON), property-panel hiding for `defaultValue` / `correctAnswer`, Creator-side `BASE_PATH` wiring. Cross-field validation is **not** done here — see `getConfigError` in the widget for the runtime banner. |
| `server/component/moduleSurveyJS/tpl_moduleSurveyCreatorJS.php`                 | Creator container — emits `data-base-path` for the Creator preview.                      |
| `server/component/moduleSurveyJS/ModuleSurveyJSView.php`                        | Creator view — DEBUG-mode CSS includes.                                                  |
| `docs/examples/video-segment-example.json`                                      | Ready-to-import sample survey covering both segment-enforced and full-video usage.       |
