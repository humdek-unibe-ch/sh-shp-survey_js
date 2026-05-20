# GPX Question Type (`gpx`)

Custom SurveyJS question that accepts a single **GPX track file**,
parses it in the browser, renders an immediate route preview on a real
**OpenStreetMap** basemap, and saves both the parsed payload and the
uploaded raw file alongside the survey response. Introduced in
**plugin v1.4.11**.

## Purpose

Many outdoor / mobility studies collect a recorded route from each
participant (e.g. a planned hike, a recorded ride, a walking-app
export). Doing this with a plain SurveyJS `file` question stores only
the raw `.gpx` bytes and gives the analyst nothing to look at on the
dashboard. The `gpx` question type encapsulates the end-to-end flow:

- Accept exactly one `.gpx` file (extension whitelist + native input
  `accept=".gpx,application/gpx+xml"`).
- Parse the GPX entirely client-side via `DOMParser` — no new server
  dependency.
- Compute total distance (haversine), elevation gain / loss, simple
  hiking / biking duration estimates, and an evenly-sampled subset of
  the route for compact storage / preview.
- Show a Leaflet + OSM preview the moment the file is selected, with
  Start / End markers and a fit-bounds frame.
- Upload the raw `.gpx` to the server immediately (not on survey
  complete) and save the parsed payload in the **main answer field**
  + the uploaded-file metadata in an **auto-generated sibling
  `<answer>_file` field**.
- Replace / Clear actions delete the previously-uploaded `.gpx` from
  disk via a safe backend action restricted to the survey upload root.

## Compatibility

| Item               | Version       |
| ------------------ | ------------- |
| SurveyJS           | **1.9.124**   |
| SelfHelp           | v7.3.1+       |
| Plugin             | **v1.4.11**+  |
| Leaflet (vendored) | **1.9.4**     |
| Browser            | Any modern browser supporting `DOMParser`, `FormData`, `fetch` and CSS `grid` |

The plugin must remain on SurveyJS v1.9.124; do not upgrade. The
implementation uses only public v1.9.x APIs (`Survey.Serializer.addClass`,
`Survey.ElementFactory.Instance.registerCustomQuestion`,
`Survey.CustomWidgetCollection.Instance.addCustomWidget`,
`Survey.surveyLocalization`).

## Architecture

The question type is a **standalone class** with parent `"empty"` — it
does **not** extend the built-in `file` question. This is the same
pattern the v1.4.8 `video` question uses, and for the same reason:
inheriting from `file` would render SurveyJS' native file-upload UI on
top of our widget and trigger the generic "upload on complete" path,
which is exactly the flow we need to bypass for GPX.

```js
Survey.Serializer.addClass(
    "gpx",
    [
        {
            name: "sampledPointCount:number",
            default: 100,
            minValue: 2,
            category: "general",
            displayName: "Sampled point count"
        }
    ],
    null,
    "empty"
);
```

> **About the type case** — SurveyJS v1.9.124 internally lowercases
> every class name in `addClass`. The canonical type therefore is
> `gpx`. Compare types case-insensitively or against the lowercased
> form in any custom code that branches on `getType()`.

## Property surface

| Property            | Type   | Default | Description |
| ------------------- | ------ | ------- | ----------- |
| `sampledPointCount` | number | `100`   | Number of evenly-spaced points kept when downsampling the route for storage and preview. Must be ≥ 2. |

The standard inherited properties (`name`, `valueName`, `title`,
`description`, `isRequired`, `visible`, `visibleIf`, ...) all apply.
`defaultValue` and `correctAnswer` are hidden in the Creator property
panel because the answer is auto-generated.

## Effective answer name

SurveyJS uses `valueName` when set, otherwise `name`, to address the
field in the response data hash. The question's main parsed payload is
saved under this effective name. The sibling **file metadata** is saved
under `<effectiveName>_file`. Examples:

| `name`       | `valueName`   | Main field   | File field        |
| ------------ | ------------- | ------------ | ----------------- |
| `gpx_route`  | *(unset)*     | `gpx_route`  | `gpx_route_file`  |
| `gpx_q1`     | `route`       | `route`      | `route_file`      |

## Value contract

### Main answer field

```json
{
  "name": "Route name or null",
  "time": "metadata time or null",
  "totalDistanceKm": 12.34,
  "elevationGainM": 456,
  "elevationLossM": 321,
  "estimatedHikingTimeHours": 4.1,
  "estimatedBikingTimeHours": 1.8,
  "start": {
    "lat": 47.1234,
    "lon": 8.5678,
    "ele": 512,
    "distanceFromStartM": 0
  },
  "end": {
    "lat": 47.0987,
    "lon": 8.6543,
    "ele": 487,
    "distanceFromStartM": 12345
  },
  "pointCountOriginal": 987,
  "sampledPointCount": 100,
  "sampledPoints": [
    [47.12, 8.56, 512, 0],
    [47.13, 8.57, 520, 50],
    ...
  ]
}
```

Rounding follows the example payload: lat/lon to 6 decimals,
`totalDistanceKm` to 2 decimals, the hour estimates to 1 decimal,
elevations and distances in metres rounded to integers.

### Sibling file field (`<effectiveName>_file`)

Stored as a **single-item array** to match the shape SurveyJS' generic
file question uses, so existing dashboard / review code continues to
render it without any special-casing:

```json
[
  {
    "name": "my-route.gpx",
    "type": "application/gpx+xml",
    "content": "?file_path=upload/<survey-id>/<response-id>/<user-code>/<question>/<saved-file>"
  }
]
```

## Parsing rules

The widget parses GPX with the browser's `DOMParser`:

- Multiple `<trk>` / `<trkseg>` sections are supported. All `<trkpt>`
  elements are flattened in document order.
- A file with **no `<trkpt>` elements** is rejected with a
  question-level error and nothing is stored.
- A file whose XML is structurally invalid (no parseable root, or a
  `<parsererror>` from `DOMParser`) is rejected the same way.
- Distance between consecutive points is computed with the haversine
  formula (great-circle distance on a sphere of radius 6 371 000 m).
  No projection / map-matching is applied — the figure reflects the
  raw `(lat, lon)` track exactly.
- Elevation gain / loss is computed by summing only the positive /
  negative deltas between consecutive points.
- Sampling: evenly distributed across the full route. Index `k` in
  `[0, n-1]` maps to `round(k * (total-1) / (n-1))`, which guarantees
  the first and last point are always included.

## Upload / persistence flow

The GPX question does **not** reuse the generic "upload all files on
complete" path used by SurveyJS' built-in file question. Uploads happen
**immediately** after a successful local parse:

1. **File selected** — extension validated client-side. Reject anything
   that isn't `.gpx`.
2. **Parsed locally** with `DOMParser`. Failure surfaces as a
   question-level error and nothing is uploaded or stored.
3. **Old file deleted** (if any). A previously-uploaded `.gpx` for the
   same question is removed from disk first via the new safe
   `delete_gpx` action.
4. **Raw file uploaded** to the server via a multipart POST to the
   survey runtime controller with `upload_gpx=1`. Reuses the existing
   upload folder layout (`SURVEYJS_UPLOAD_FOLDER/<survey-id>/<response-id>/<user-code>/<question>/`).
5. **Both fields set** — the parsed payload to the main answer field,
   the upload-file metadata to the sibling `<answer>_file` field. The
   sibling value uses the same shape the generic upload path produces
   (`{ name, type, content }`), so the dashboard download endpoint
   serves it without changes.

In the **Creator preview** (`survey.isDesignMode`), the widget skips
the server upload and only renders the parse + map locally so
designers can verify a file without polluting the upload folder.

### Clear

Pressing **Clear** does three things:

1. Delete the previously-uploaded `.gpx` from disk (best-effort).
2. Clear the question's main value.
3. Clear the sibling `_file` value.

### Backend actions

| Action       | POST trigger        | Body            | Description |
| ------------ | ------------------- | --------------- | ----------- |
| Upload GPX   | `upload_gpx=1`      | `$_FILES[<name>]`, `response_id`, `question_name` | Validates `.gpx` extension; saves file under the survey upload root; returns `{ "<file>.gpx": "?file_path=..." }`. |
| Delete GPX   | `delete_gpx=1`      | `file_path`     | Refuses traversal (`..`), refuses files outside `SURVEYJS_UPLOAD_FOLDER/`, refuses non-`.gpx` extensions, then `unlink`s. |

The upload endpoint reuses the same code path SurveyJS' generic upload
uses for the directory structure, so the dashboard download endpoint
(`?file_path=...`) serves both kinds of files uniformly.

## Map preview

The route preview uses **Leaflet 1.9.4**, vendored locally in the
plugin (`server/component/style/surveyJS/js/6_leaflet.js` and
`server/component/style/surveyJS/css/leaflet.css`, with marker / layer
images under `css/images/`). No CDN is used at runtime.

The map renders:

- An OpenStreetMap tile layer
  (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with the
  upstream attribution string.
- A single polyline through `sampledPoints` (blue, 4 px, opacity 0.85).
- A Start marker (default Leaflet pin) with a "Start" tooltip.
- An End marker with an "End" tooltip.
- `fitBounds` framing the polyline with 20 px padding.

The preview is rebuilt from the persisted `sampledPoints` whenever the
question's value changes, including on autosave restore / page-change
restore, so refreshes don't require re-reading the local file.

### CSP

The plugin's CSP hook (`SurveyJSHooks::setCspRules`) is extended to add
the OSM tile hosts to `img-src`:

```
img-src 'self' data: https://*.tile.openstreetmap.org https://tile.openstreetmap.org
```

If the upstream CSP did not contain an `img-src` directive, the hook
adds one with the same hosts plus `'self'` and `data:`.

## Dashboard rendering

Any tabulator column whose name ends in `_file` is rewritten by
`dashboard.js` (v1.4.11) into a clickable link. The displayed text is
the file's original name; the link target is `?file_path=…` (the
content stored in the metadata), which the existing
`ModuleSurveyJSDashboardController::output_file` endpoint serves.

The controller now maps the `.gpx` extension to
`application/gpx+xml` so downloaded files are tagged with the standard
GPX media type. Other extensions are unchanged.

## Limitations (v1.4.11)

- Single file per question. There is no "add multiple GPX files"
  affordance in this release.
- The parsed payload is the primary answer. Statistics (distance,
  elevation, durations) are computed only at parse time; editing them
  by hand in the SurveyJS data hash is not supported.
- The preview fidelity follows the persisted `sampledPointCount`; no
  separate full-resolution preview contract is stored.
- The dashboard link opens / downloads the raw `.gpx`; there is no
  dedicated full-screen GPX viewer page in this release.

## Toolbox JSON

Drop-in default for adding a GPX question from the Creator toolbox:

```json
{
  "type": "gpx",
  "name": "gpx_route",
  "title": "Upload GPX route",
  "sampledPointCount": 100
}
```

## Where this fits in the existing plugin

| Concern                           | File |
| --------------------------------- | ---- |
| Widget + parse + preview + upload | `server/component/style/surveyJS/js/7_gpxQuestionWidget.js` |
| Leaflet vendor JS                 | `server/component/style/surveyJS/js/6_leaflet.js` |
| Leaflet vendor CSS + images       | `server/component/style/surveyJS/css/leaflet.css`, `.../css/images/*.png` |
| Question styles                   | `server/component/style/surveyJS/css/gpx-question.css` |
| Runtime asset wiring              | `server/component/style/surveyJS/SurveyJSView.php` |
| Creator asset wiring              | `server/component/moduleSurveyJS/ModuleSurveyJSView.php` |
| Toolbox + hidden props            | `server/component/moduleSurveyJS/js/8_survey.js` |
| Upload / delete actions           | `server/component/style/surveyJS/SurveyJSController.php`, `SurveyJSModel.php` |
| CSP (OSM tiles)                   | `server/component/SurveyJSHooks.php` |
| `.gpx` MIME + dashboard links     | `server/component/moduleSurveyJSDashboard/ModuleSurveyJSDashboardController.php`, `.../js/dashboard.js` |
