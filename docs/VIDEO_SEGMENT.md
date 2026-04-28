# Video Segment Question Type (`videoSegment`)

Custom SurveyJS question that plays an HTML5 video clamped to a configurable
`[startTimestamp, endTimestamp]` window. Introduced in **plugin v1.4.7** and
finalized in **v1.4.8**.

## Purpose

Many studies and training surveys need participants to watch a **specific
excerpt** of a longer video before answering. Doing this with a plain
`<video>` element, or by extending the SurveyJS `image` question (which
supports `contentMode: "video"` but plays the whole file), requires custom
JavaScript per survey and is brittle. The `videoSegment` question type
encapsulates that behaviour as a first-class custom question:

- The participant cannot play the video before `startTimestamp`.
- The participant cannot watch past `endTimestamp` — both natural playback
  and timeline-scrubber seeks are clamped.
- Replays always restart at `startTimestamp`.
- The question records playback metadata so dashboards/analytics can tell
  whether the participant actually finished the segment.
- The Creator UI is intentionally minimal — the only configuration is
  **Video URL**, **Start timestamp**, **End timestamp**, plus the optional
  layout properties (**Video fit / Video height / Video width**) that are
  applied directly to the `<video>` element.

## Compatibility

| Item               | Version       |
| ------------------ | ------------- |
| SurveyJS           | **1.9.124**   |
| SelfHelp           | v7.3.1+       |
| Plugin             | **v1.4.7**+   |
| Browser            | Any modern browser supporting HTML5 `<video>` (Chrome, Firefox, Safari, Edge) |

The plugin **must remain on SurveyJS v1.9.124**; do not upgrade the SurveyJS
library. The implementation only uses public v1.9.x APIs:

- `Survey.Serializer.addClass(name, props, null, "empty")`
- `Survey.ElementFactory.Instance.registerCustomQuestion`
- `Survey.CustomWidgetCollection.Instance.addCustomWidget`
- `Survey.surveyLocalization` / `SurveyCreator.editorLocalization` /
  `SurveyCreator.localization`
- `SurveyCreator.SvgRegistry.registerIconFromSvg` (with graceful fallback to
  the built-in `icon-image` when the registry isn't exposed in this build)
- `creator.onPropertyValidationCustomError` and `creator.onShowingProperty`

## Architecture

The question type is a **standalone class** with parent `"empty"`, **not**
an extension of the built-in `image` question:

```js
Survey.Serializer.addClass(
    "videosegment",
    [
        { name: "videoUrl:string",       isRequired: true, displayName: "Video URL" },
        { name: "startTimestamp:number", isRequired: true, default: 0,  minValue: 0 },
        { name: "endTimestamp:number",   isRequired: true, default: 30, minValue: 0 },
        { name: "videoFit",   default: "contain", choices: ["none","contain","cover","fill"] },
        { name: "videoHeight:string", default: "" },
        { name: "videoWidth:string",  default: "" }
    ],
    null,
    "empty"   // <-- standalone, NOT "image"
);
```

> **About the type case** — SurveyJS v1.9.124 internally lowercases every
> class name in `Survey.Serializer.addClass(name, ...)` (the implementation
> does `name = name.toLowerCase()` before storing the class). The canonical
> type therefore is **`videosegment`**, all lowercase, and that is what
> `question.getType()` returns at runtime regardless of the case the survey
> JSON happens to use. We rely on `Survey.surveyLocalization.locales[loc]
> .qt.videosegment = "Video Segment"` to give it a pretty user-facing
> label. Compare types case-insensitively (or against the lowercased form)
> in any custom code that branches on `getType()`; comparing strictly
> against `"videoSegment"` will silently never match.

### Why standalone, not `image`?

An earlier iteration extended the `image` question. That broke things:

1. The image question's native renderer rendered the question instead of our
   custom widget, so the segment was **never** clamped to `[start, end]` —
   the full video played.
2. The image renderer used `imageLink` as-is, bypassing our
   `resolveVideoUrl()` helper, so SelfHelp-relative paths like
   `/assets/video.mp4` were not prefixed with `BASE_PATH` and produced 404s
   when SelfHelp was mounted at a sub-path (e.g. `/selfhelp`).
3. The image renderer's "no value" placeholder offered drag-and-drop file
   upload, which is exactly the affordance we need to forbid.

By inheriting from `empty`, the custom widget's `htmlTemplate` is the sole
source of truth and all of those problems disappear.

### Layout properties — really applied

`videoFit`, `videoHeight` and `videoWidth` aren't just metadata; the widget
applies them directly to the `<video>` element via inline styles:

| Property      | Effect                                  |
| ------------- | --------------------------------------- |
| `videoFit`    | `style.objectFit` (default `contain`)   |
| `videoHeight` | `style.height` (any CSS length string)  |
| `videoWidth`  | `style.width`  (any CSS length string)  |

They are also wired up via `registerFunctionOnPropertyValueChanged` so
editing them in the Creator updates the preview live without a reload.

## Installation

The question is bundled with the SurveyJS plugin. Once you are running
plugin **v1.4.7+** there is nothing extra to install — the widget is
registered automatically the first time a survey page loads.

If you are upgrading from a previous version:

1. Pull the latest plugin code into `server/plugins/sh-shp-survey_js`.
2. From `gulp/`, run `npx gulp` to rebuild `css/ext/survey-js.min.css`.
   The new file `server/component/style/surveyJS/css/video-segment.css` is
   matched by the existing `server/component/style/**/css/*.css` glob and
   gets concatenated into the production bundle automatically.
3. Hard-refresh your browser (the SurveyJS Creator caches static assets).

No SQL migration is required: the question is implemented entirely in
JS/CSS and stores its configuration inside the SurveyJS JSON.

### CSS loading paths

| Mode          | How the CSS is loaded                                           |
| ------------- | --------------------------------------------------------------- |
| Production    | Bundled by gulp into `css/ext/survey-js.min.css`.               |
| `DEBUG = 1`   | Loaded directly from `server/component/style/surveyJS/css/video-segment.css` by both `SurveyJSView` and `ModuleSurveyJSView`. |

## Property reference

| Property         | Type   | Required | Default       | Editor / display name                |
| ---------------- | ------ | -------- | ------------- | ------------------------------------ |
| `videoUrl`       | string | yes      | `""`          | "Video URL"                          |
| `startTimestamp` | number | yes      | `0`           | "Start timestamp (seconds)"          |
| `endTimestamp`   | number | yes      | `30`          | "End timestamp (seconds)"            |
| `videoFit`       | enum   | no       | `"contain"`   | "Video fit" — `none`/`contain`/`cover`/`fill` |
| `videoHeight`    | string | no       | `""`          | "Video height (CSS-accepted values)" |
| `videoWidth`     | string | no       | `""`          | "Video width (CSS-accepted values)"  |

`defaultValue` and `correctAnswer` are hidden from the property panel
because the value is auto-generated playback metadata; setting them by hand
would not have a meaningful effect.

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

`BASE_PATH` is the SelfHelp install prefix (PHP constant, e.g. `/selfhelp`).
It is exposed to JavaScript as `window.SELFHELP_BASE_PATH`:

- **Runtime** (`SurveyJSView::output_content()`) writes
  `survey_fields.base_path` into the `data-survey-js-fields` attribute.
- `4_surveyJS.js → initSurveyJS()` reads that attribute and sets
  `window.SELFHELP_BASE_PATH` **before** the survey is rendered.

If `window.SELFHELP_BASE_PATH` is empty or undefined, root-relative URLs are
returned unchanged and the browser resolves them against the document host.

## Playback behaviour

The custom widget attaches handlers to the `<video>` element to enforce the
segment window:

| Event           | What it does                                                    |
| --------------- | --------------------------------------------------------------- |
| `loadedmetadata`| Seeks to `startTimestamp` so playback starts exactly there.     |
| `seeking` / `seeked` | If `currentTime < startTimestamp`, snap to `startTimestamp`. If `currentTime > endTimestamp`, snap to `endTimestamp` and pause. |
| `timeupdate`    | If `currentTime >= endTimestamp`, snap to `endTimestamp`, pause and record the metadata. |
| `ended`         | Reset `currentTime` back to `startTimestamp` (replay starts at the segment beginning). |
| `play`          | If the user presses play after reaching the end, snap back to `startTimestamp` first. |

The native HTML5 `<video controls>` UI is shown — including the timeline
scrubber. The user is free to pause/resume and seek **inside** the segment;
seeks outside the segment are silently clamped.

In **read-only** mode, native controls are hidden and the video cannot be
interacted with.

## Question value

The widget continuously updates the question's value as the participant
interacts with the player — **not** only when the segment finishes. Every
play, pause, seek and end event triggers a value assignment, so a survey
that is submitted mid-playback still has a meaningful record of where the
participant got to and what they did last.

```jsonc
{
    "watched":        true,                       // true once currentTime ≥ endTimestamp
    "currentTime":    32.4,                       // last observed currentTime, clamped into [start, end]
    "startTimestamp": 12,                         // echoed for audit
    "endTimestamp":   45,                         // echoed for audit
    "duration":       33,                         // (end - start)
    "watchedSeconds": 21.7,                       // total seconds the user actually watched (excludes seeks)
    "percentWatched": 0.658,                      // watchedSeconds / duration, capped at 1
    "startedAt":      "2026-04-28T11:31:50.000Z", // first time the user pressed play
    "lastUpdatedAt":  "2026-04-28T11:32:25.000Z", // wall-clock of the most recent event
    "lastEvent":      "pause",                    // "play" | "pause" | "seek" | "ended" | "clamp"
    "completedAt":    null                        // ISO 8601 once `watched` becomes true
}
```

| `lastEvent` value | Trigger                                                         |
| ----------------- | --------------------------------------------------------------- |
| `play`            | Native `play` event (initial start, resume after pause, replay) |
| `pause`           | Native `pause` event before reaching `endTimestamp`             |
| `seek`            | Native `seeked` event with `currentTime` inside `[start, end]`  |
| `clamp`           | User tried to seek past `endTimestamp`; widget snapped them back to `endTimestamp` and paused |
| `ended`           | `currentTime` reached `endTimestamp` (natural end of segment)   |

`watchedSeconds` measures wall-clock time spent actually playing inside
the segment — seeks contribute zero seconds (the watch-rate accumulator
is reset across a seek). Pause/resume cycles do not double-count.

> A per-event log was deliberately **not** included. The cumulative
> snapshot (`lastEvent`, `currentTime`, `watchedSeconds`, `completedAt`)
> already answers every analytics question the plugin needs today, and a
> per-event array would inflate every survey response without obvious
> benefit. If you need full event history, log it from a parent component
> via `survey.onValueChanged` instead of changing the question schema.

The schema is intentionally not editable in the Creator property panel;
`defaultValue` and `correctAnswer` are hidden because hand-set values
would not have a meaningful effect.

## Validation

Configuration errors are reported in two places:

1. **Survey Creator** — single-field via the `isRequired` / `minValue`
   declarations on the property; cross-field via
   `creator.onPropertyValidationCustomError` (e.g. `startTimestamp >=
   endTimestamp`).
2. **Runtime** — when the survey is rendered, the widget's `afterRender`
   calls `getConfigError(question)` and, if it returns an error message,
   shows a visible red banner above the video and adds the error to the
   question via `Survey.SurveyError`.

Validated conditions:

- `videoUrl` is required and must be non-empty.
- `startTimestamp` and `endTimestamp` are required and must be finite,
  non-negative numbers.
- `startTimestamp` must be **strictly less than** `endTimestamp`.

## Toolbox icon

The widget tries to register a video-camera SVG via
`SurveyCreator.SvgRegistry.registerIconFromSvg("video-segment", ...)`. If
that registry is not exposed by this build of survey-creator-knockout, the
widget falls back to the built-in `icon-image`. The resolved icon name is
made available to `8_survey.js` through `window.__videoSegmentIconName`.

## Question-type label

By default SurveyJS renders the question-type dropdown label as
`type.toLowerCase()`, which produces the unreadable single-word
`"videosegment"`. The widget seeds the `qt.videosegment` entry (lowercase
key, matching the canonical lowercased class name) of every locale in
`Survey.surveyLocalization`, `SurveyCreator.editorLocalization` and
`SurveyCreator.localization` with `"Video Segment"`, so the label displays
correctly regardless of which Creator build is in use.

## Usage example

```json
{
    "type": "videosegment",
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

The `type` is intentionally lowercase because SurveyJS internally lowercases
every registered class name (see *Architecture* above). Both the toolbox
button and any survey JSON exported from the Creator emit `videosegment`.

A complete example survey is in
[`docs/examples/video-segment-example.json`](examples/video-segment-example.json).

## Limitations

- The `<video>` element shows the **native** HTML5 player UI, including its
  full timeline. Seeks outside the segment are clamped, but the visual
  scrubber still spans the whole file.
- Browsers may refuse to autoplay videos with sound; if you need autoplay,
  set `muted` on the `<video>` element (currently you would do that by
  editing the widget's `htmlTemplate`).
- The configured timestamps are validated against each other, but not
  against the actual video duration. If `endTimestamp` exceeds the file
  length, the segment effectively ends at the file's natural end.

## Troubleshooting

| Symptom                                                            | Likely cause / fix                                                                                                        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `404` for `<host>/assets/video.mp4` when SelfHelp is at `/selfhelp` | `window.SELFHELP_BASE_PATH` not set. Confirm `4_surveyJS.js` runs before the survey renders (it does in the bundled JS) and that the surrounding HTML has `data-survey-js-fields` on `.selfHelp-survey-js-holder`. |
| Full video plays, segment not enforced                              | A previous version of the widget extended `image`. Hard-refresh the browser to drop the cached JS; ensure you are on plugin v1.4.8+. |
| Question card renders an empty `<div>` (no video, no error banner)  | Custom-widget `isFit()` is not matching. SurveyJS lowercases all class names; comparing `getType() === "videoSegment"` (camelCase) silently never matches. The widget compares against `"videosegment"`. Hard-refresh to drop cached JS. |
| Toolbox shows "videosegment" lowercase                              | Old cached JS. Hard-refresh; the v1.4.8 widget seeds three localization namespaces and writes `qt.videosegment` (the canonical lowercased key). |
| Toolbox icon is empty                                               | Old cached JS or missing icon registration. Plugin v1.4.8+ falls back to `icon-image` automatically.                      |
| "Video URL is required" / "startTimestamp must be strictly less than endTimestamp" | Configuration error — fix the property values in the Creator.                                                       |

## Files of interest

| File                                                                            | Purpose                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `server/component/style/surveyJS/js/5_videoSegmentWidget.js`                    | Class definition, custom widget, URL resolver, playback enforcement, icon + localization. |
| `server/component/style/surveyJS/css/video-segment.css`                         | Styles for the player and error banner.                                |
| `server/component/style/surveyJS/SurveyJSView.php`                              | Runtime view — exposes `BASE_PATH` to JS via `data-survey-js-fields`. |
| `server/component/style/surveyJS/js/4_surveyJS.js`                              | Reads `BASE_PATH` and assigns `window.SELFHELP_BASE_PATH`.            |
| `server/component/moduleSurveyJS/js/8_survey.js`                                | Toolbox refinement (icon, default JSON), property-panel hiding, cross-field validator. |
| `server/component/moduleSurveyJS/ModuleSurveyJSView.php`                        | Creator view — DEBUG-mode CSS includes.                               |
| `docs/examples/video-segment-example.json`                                      | Ready-to-import sample survey.                                        |
