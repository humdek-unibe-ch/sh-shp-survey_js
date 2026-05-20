-- =========================================================================
-- SurveyJS plugin — v1.5.0 migration
-- =========================================================================
-- Introduces the new `gpxMap` SelfHelp style that renders a Leaflet /
-- OpenStreetMap preview from a list of GPX sample points.
--
-- The style is registered as `type = view` (no children, no controller)
-- so the SelfHelp framework instantiates `GpxMapView` directly via
-- `SimpleStyleComponent`. Default internal fields (`debug`, `data_config`,
-- `condition`, `css`, `css_mobile`) plus the new `sample_points` field
-- are linked here.
--
-- Idempotent: every INSERT uses `INSERT IGNORE`, so running the script
-- twice on the same database is safe.
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 0) Bump the plugin version.
-- ---------------------------------------------------------------------------
UPDATE `plugins`
SET version = 'v1.5.0'
WHERE `name` = 'survey-js';

-- ---------------------------------------------------------------------------
-- 1) Register the new internal field `sample_points`.
-- ---------------------------------------------------------------------------
-- `display = 0` keeps the field internal-only: it never appears as a
-- translation row in the Creator's per-language editor (it would make no
-- sense to translate a JSON array of coordinates). The field is JSON so
-- the CMS UI gives the designer a JSON editor when they edit it directly,
-- and the framework's `data_config` interpolation pass can still substitute
-- `{{var}}` tokens inside the stored string before the View receives it.
INSERT IGNORE INTO `fields` (`id`, `name`, `id_type`, `display`)
VALUES (NULL, 'sample_points', get_field_type_id('json'), '0');

-- ---------------------------------------------------------------------------
-- 2) Register the new `gpxMap` style.
-- ---------------------------------------------------------------------------
-- `type = view`     -> SimpleStyleComponent instantiates GpxMapView directly.
-- `group = Wrapper` -> shown under the Wrapper group in the Creator's
--                      style toolbox, alongside surveyJS / dataContainer.
INSERT IGNORE INTO `styles` (`name`, `id_type`, `id_group`, `description`)
VALUES (
    'gpxMap',
    (SELECT id FROM styleType  WHERE `name` = 'view'    LIMIT 1),
    (SELECT id FROM styleGroup WHERE `name` = 'Wrapper' LIMIT 1),
    'Render a Leaflet / OpenStreetMap preview from a list of GPX sample points. The `sample_points` field accepts either a hard-coded JSON array of `[lat, lon]` (or `[lat, lon, ele, distanceFromStartM]`) tuples, a full `gpx` SurveyJS answer object (auto-extracts `sampledPoints`), or any `data_config`-driven interpolation that resolves to either. Use this style to display a saved route outside the SurveyJS runtime — on a profile page, a dashboard card, anywhere SelfHelp renders sections.'
);

-- ---------------------------------------------------------------------------
-- 3) Wire the default internal fields to the new style.
-- ---------------------------------------------------------------------------
-- `css` / `css_mobile` are inherited helpers for adding extra wrapper
-- classes on web / mobile renders. Standard across nearly every style.
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (
    get_style_id('gpxMap'),
    get_field_id('css'),
    NULL,
    'Allows to assign CSS classes to the root item of the style.'
);
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (
    get_style_id('gpxMap'),
    get_field_id('css_mobile'),
    NULL,
    'Allows to assign CSS classes to the root item of the style for the mobile version.'
);

-- `condition` — JSON-logic-php expression that gates rendering. Same
-- help blurb the surveyJS style uses, kept consistent so designers
-- don't have to learn a new format per style.
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (
    get_style_id('gpxMap'),
    get_field_id('condition'),
    NULL,
    'The field `condition` allows to specify a condition. Note that the field `condition` is of type `json` and requires\n1. valid json syntax (see https://www.json.org/)\n2. a valid condition structure (see https://github.com/jwadhams/json-logic-php/)\n\nOnly if a condition resolves to true the style will be rendered.'
);

-- `data_config` — JSON definition of what data to load before
-- interpolating the section's other fields. When set, every `{{var}}`
-- token in `sample_points` is replaced by the matching key from the
-- loaded data row at render time.
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (
    get_style_id('gpxMap'),
    get_field_id('data_config'),
    '',
    'Define data configuration for fields that are loaded from DB and can be used inside the style with their param names. The name of the field can be used between `{{param_name}}` to load the required value. Use this to populate `sample_points` from a dataTable row, a previous `gpx` question answer, or any other source the data-config builder supports.'
);

-- `debug` — checkbox that toggles the standard StyleView debug pane
-- (rendered by `StyleView::output_debug()` below the style content).
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (
    get_style_id('gpxMap'),
    get_field_id('debug'),
    NULL,
    'If checked the section renders a debug pane (loaded fields, data_config result, condition result) below the map. Useful while wiring up a dynamic `data_config`-driven `sample_points` value.'
);

-- ---------------------------------------------------------------------------
-- 4) Wire the gpxMap-specific `sample_points` field to the style.
-- ---------------------------------------------------------------------------
-- The help text intentionally calls out all three accepted shapes so a
-- designer reading just the property panel knows what they can paste in.
INSERT IGNORE INTO `styles_fields` (`id_styles`, `id_fields`, `default_value`, `help`)
VALUES (
    get_style_id('gpxMap'),
    get_field_id('sample_points'),
    '',
    'JSON-encoded list of route points that drive the map polyline + start/end markers. **Accepts three shapes**:\n\n1. **Bare array of points** — `[[lat, lon], [lat, lon, ele, distanceFromStartM], …]`. Hard-code a route directly here.\n2. **Full `gpx` SurveyJS answer object** — `{ "name": "…", "time": "…", "sampledPoints": [[lat, lon, ele, distM], …], … }`. The renderer auto-extracts the `sampledPoints` array, so you can interpolate a whole answer row from `data_config` (e.g. `{{gpx_route}}`) without unwrapping it first.\n3. **`data_config`-driven interpolation** — anything that resolves at render time to either of the two shapes above. Set `data_config` to load the desired column / row and reference its name here as `{{column_name}}`.\n\nLeave blank to render an empty-state placeholder.'
);
