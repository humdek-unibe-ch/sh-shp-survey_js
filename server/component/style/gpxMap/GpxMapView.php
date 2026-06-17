<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../../component/style/StyleView.php";

/**
 * View class for the `gpxMap` style (plugin v1.5.0+).
 *
 * Renders a Leaflet/OpenStreetMap map preview from a list of GPX
 * sample points stored on the section's `sample_points` field. The
 * style is registered as `type = view` so the SelfHelp framework
 * instantiates this class directly via `SimpleStyleComponent` — no
 * dedicated Component / Model / Controller layer is needed.
 *
 * Data flow
 * ---------
 * `sample_points` is an internal JSON field (`display = 0`) and it
 * accepts THREE shapes; the renderer normalises them all into a
 * uniform polyline at runtime (the actual coercion happens client-
 * side in `js/gpx-map.js` so we don't have to second-guess the
 * payload structure at PHP time):
 *
 *   1. Bare array of points:   [[lat, lon], [lat, lon], …]
 *      or                       [[lat, lon, ele, distM], …]
 *   2. Object with a sampledPoints key (the persisted shape of a
 *      `gpx` SurveyJS question answer):
 *      { name, time, sampledPoints: [[lat, lon, ele, distM], …], … }
 *   3. A `data_config`-driven interpolation that resolves to either
 *      of the above. The framework substitutes the {{var}} tokens
 *      automatically before `get_db_field()` returns the value, so
 *      we just hand whatever we got down to the client.
 *
 * Debug behaviour
 * ---------------
 * The base `StyleView::output_debug()` honours the `debug` field
 * automatically when called from `output_content()`. We invoke it
 * after our render so the debug pre block lands below the map.
 */
class GpxMapView extends StyleView
{
    /* Private Properties *****************************************************/

    /**
     * Raw `sample_points` field content. Always a string after the
     * framework's interpolation pass; may be empty when neither
     * hard-coded data nor a resolved `data_config` interpolation is
     * present (e.g. brand-new section in the CMS).
     */
    private $sample_points_raw;

    /* Constructors ***********************************************************/

    /**
     * The constructor.
     *
     * @param object $model
     *  The StyleModel instance owning this view.
     */
    public function __construct($model)
    {
        parent::__construct($model);
        $this->sample_points_raw = $model->get_db_field('sample_points', '');
    }

    /* Public Methods *********************************************************/

    /**
     * Render the gpxMap view.
     *
     * We always emit the wrapper + map container, even when
     * `sample_points` is empty: the client-side script renders an
     * empty-state hint inside the container in that case (so a
     * designer who has just dropped the style in but hasn't filled
     * the field yet still gets a visible placeholder).
     */
    public function output_content()
    {
        $payload = $this->sample_points_raw;
        if (!is_string($payload)) {
            // Defensive cast in case the framework already decoded
            // the JSON for us (some interpolation paths do).
            $payload = json_encode($payload);
        }
        require __DIR__ . "/tpl_gpxMap.php";
        $this->output_debug();
    }

    /**
     * Mobile / JSON rendering path.
     *
     * Mobile clients don't ship Leaflet, so we expose the raw
     * payload + style metadata and let the mobile app decide how
     * to render the route (typically via its native map view).
     * The mobile contract intentionally mirrors what the `gpx`
     * SurveyJS question stores so existing route-rendering code
     * on the mobile side keeps working.
     */
    public function output_content_mobile()
    {
        $style = parent::output_content_mobile();
        $decoded = null;
        if (is_string($this->sample_points_raw) && $this->sample_points_raw !== '') {
            $decoded = json_decode($this->sample_points_raw, true);
        } elseif (is_array($this->sample_points_raw)) {
            $decoded = $this->sample_points_raw;
        }
        $style['sample_points'] = $decoded;
        return $style;
    }

    /**
     * JavaScript includes for the style.
     *
     * The vendored Leaflet 1.9.4 build that ships under the
     * `surveyJS` style is reused as-is — there's no reason to
     * duplicate the ~140 KB library inside this style's folder.
     * The gpxMap-specific init script (`js/gpx-map.js`) wires up
     * Leaflet onto every `.sjs-gpx-map-style` container on the
     * page.
     *
     * @param array $local
     *  Optional override list. Empty by default; callers can pass
     *  a custom list to short-circuit the defaults.
     *
     * @retval array
     */
    public function get_js_includes($local = array())
    {
        if (empty($local)) {
            $local = array(
                __DIR__ . "/../surveyJS/js/6_leaflet.js",
                __DIR__ . "/js/gpx-map.js"
            );
        }
        return parent::get_js_includes($local);
    }

    /**
     * CSS includes for the style.
     *
     * Vendored Leaflet CSS is loaded standalone in both DEBUG and
     * production because it contains `url(images/...)` references
     * that must resolve relative to its own location on disk —
     * concatenating it into the bundle would break the marker /
     * layer-control icons (same caveat that applies to the GPX
     * question, see `surveyJS/SurveyJSView::get_css_includes`).
     *
     * @param array $local
     *  Optional override list. Empty by default; callers can pass
     *  a custom list to short-circuit the defaults.
     *
     * @retval array
     */
    public function get_css_includes($local = array())
    {
        if (empty($local)) {
            if (DEBUG) {
                $local = array(
                    __DIR__ . "/../surveyJS/css/leaflet.css",
                    __DIR__ . "/css/gpx-map.css"
                );
            } else {
                $local = array(
                    __DIR__ . "/../../../../css/ext/survey-js.min.css?v=" . rtrim((string) shell_exec("git describe --tags")),
                    // leaflet.css is excluded from the bundle (see
                    // gulpfile.js) because url(images/...) refs must
                    // resolve relative to its own on-disk location.
                    // Load it standalone in production too.
                    __DIR__ . "/../surveyJS/css/leaflet.css"
                );
            }
        }
        return parent::get_css_includes($local);
    }
}
?>
