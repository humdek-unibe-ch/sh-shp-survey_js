/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * GPX custom SurveyJS question widget (v1.4.11).
 *
 * Built against SurveyJS v1.9.124 (do NOT upgrade).
 *
 * The question type is **`gpx`**, all lowercase (SurveyJS' Serializer
 * lowercases every registered class name internally).
 *
 * Standalone class (NOT extending the built-in `file` question) because:
 *   - We need to parse the GPX in-browser and IMMEDIATELY show a route
 *     preview on a real OpenStreetMap basemap.
 *   - We do not reuse the generic SurveyJS "upload all files on complete"
 *     path. GPX files are uploaded eagerly after a successful local parse
 *     so the sibling "<answer>_file" field is set the moment the user
 *     drops the file.
 *   - Only one file is accepted per question in v1.4.11.
 *
 * Property surface
 * ----------------
 *   sampledPointCount:number   (default 100, min 2)
 *       Used both for the persisted sampledPoints array AND for the
 *       polyline rendered on the preview map.
 *
 * Value contract
 * --------------
 * The MAIN answer field (the question's normal value) stores the parsed
 * GPX object directly. The SIBLING `<effectiveName>_file` field stores
 * an uploaded-file metadata array (single-item) in the exact same shape
 * the generic file-upload path uses, so existing dashboard download
 * code continues to work.
 *
 *   main value:
 *     {
 *       name, time, totalDistanceKm, elevationGainM, elevationLossM,
 *       estimatedHikingTimeHours, estimatedBikingTimeHours,
 *       start: { lat, lon, ele, distanceFromStartM },
 *       end:   { lat, lon, ele, distanceFromStartM },
 *       pointCountOriginal,
 *       sampledPointCount,
 *       sampledPoints: [[lat, lon, ele, distFromStartM], ...]
 *     }
 *
 *   "<effectiveName>_file" value:
 *     [
 *       { name: "<original>.gpx", type: "application/gpx+xml",
 *         content: "?file_path=upload/<survey>/<response>/<code>/<question>/<file>" }
 *     ]
 */
(function registerGpxQuestionWidget() {
    "use strict";

    if (typeof Survey === "undefined" || !Survey || !Survey.Serializer) {
        return;
    }

    var COMPONENT_NAME  = "gpx";
    var COMPONENT_TITLE = "GPX Route";

    // -------------------------------------------------------------------
    // 1) Class registration
    // -------------------------------------------------------------------
    if (!Survey.Serializer.findClass(COMPONENT_NAME)) {
        Survey.Serializer.addClass(
            COMPONENT_NAME,
            [
                {
                    name: "sampledPointCount:number",
                    default: 100,
                    minValue: 2,
                    category: "general",
                    displayName: "Sampled point count",
                    description: "Number of evenly-distributed points to keep when downsampling the route for storage and preview. Minimum 2 (start and end)."
                },
                /*
                 * Localizable label / tooltip for the "Choose GPX file"
                 * button. `isLocalizable: true` makes SurveyJS:
                 *   1. Auto-create a `LocalizableString` on the question
                 *      (named `locChooseFileButtonText`) and wire the
                 *      `chooseFileButtonText` getter/setter to delegate
                 *      to it for `survey.locale`.
                 *   2. Auto-include the property in the Creator's
                 *      Translation tab so designers can fill in per-
                 *      locale strings next to the question's `title`.
                 *
                 * Resolution order at runtime (see `getButtonLabel`):
                 *   1. SurveyJS-resolved locale value (the explicit
                 *      string the designer filled in for the active
                 *      locale, or the property's default locale entry).
                 *   2. Built-in `DEFAULT_BUTTON_LABELS[<locale>].choose`
                 *      backstop (en/de/fr/it bundled).
                 *   3. English default.
                 */
                {
                    name: "chooseFileButtonText",
                    isLocalizable: true,
                    category: "general",
                    displayName: "\"Choose file\" button label (optional, falls back to localized default)",
                    description: "Tooltip + visible label on the upload button. Open the Translation tab to fill in per-locale wording. Leave blank to inherit the built-in en/de/fr/it default."
                },
                {
                    name: "clearButtonText",
                    isLocalizable: true,
                    category: "general",
                    displayName: "\"Clear\" button label (optional, falls back to localized default)",
                    description: "Tooltip + visible label on the clear button. Open the Translation tab to fill in per-locale wording. Leave blank to inherit the built-in en/de/fr/it default."
                }
            ],
            null,
            "empty"
        );

        if (Survey.ElementFactory && Survey.ElementFactory.Instance &&
            typeof Survey.ElementFactory.Instance.registerCustomQuestion === "function") {
            Survey.ElementFactory.Instance.registerCustomQuestion(COMPONENT_NAME);
        }
    }

    // -------------------------------------------------------------------
    // 2) Localized question-type display name. SurveyJS lowercases the
    //    registered class name, so the canonical type returned by
    //    `question.getType()` is `"gpx"`. Override the display label
    //    consistently with the video question.
    // -------------------------------------------------------------------
    function setQuestionTypeName(localesContainer, name, displayName) {
        if (!localesContainer) return;
        var locales = localesContainer.locales;
        if (!locales || typeof locales !== "object") return;
        Object.keys(locales).forEach(function (localeCode) {
            var locale = locales[localeCode];
            if (!locale || typeof locale !== "object") return;
            if (!locale.qt || typeof locale.qt !== "object") locale.qt = {};
            locale.qt[name] = displayName;
        });
        var defaultLocale = localesContainer.defaultLocale ||
            (typeof localesContainer.getLocale === "function" && localesContainer.getLocale("")) ||
            null;
        if (defaultLocale && typeof defaultLocale === "object") {
            if (!defaultLocale.qt || typeof defaultLocale.qt !== "object") defaultLocale.qt = {};
            defaultLocale.qt[name] = displayName;
        }
    }
    setQuestionTypeName(Survey.surveyLocalization, COMPONENT_NAME, COMPONENT_TITLE);
    if (typeof SurveyCreator !== "undefined" && SurveyCreator.editorLocalization) {
        setQuestionTypeName(SurveyCreator.editorLocalization, COMPONENT_NAME, COMPONENT_TITLE);
    }
    if (typeof SurveyCreator !== "undefined" && SurveyCreator.localization && SurveyCreator.localization.locales) {
        setQuestionTypeName(SurveyCreator.localization, COMPONENT_NAME, COMPONENT_TITLE);
    }

    // -------------------------------------------------------------------
    // 3) Toolbox icon (best-effort SVG, fall back to existing icon).
    // -------------------------------------------------------------------
    var GPX_ICON_SVG =
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>' +
        '</svg>';

    function findSvgRegistry() {
        var candidates = [];
        if (typeof SurveyCreator !== "undefined") {
            candidates.push(SurveyCreator.SvgRegistry);
            if (SurveyCreator.SurveyCreator) candidates.push(SurveyCreator.SurveyCreator.SvgRegistry);
        }
        if (typeof Survey !== "undefined") candidates.push(Survey.SvgRegistry);
        if (typeof SurveyCreatorCore !== "undefined") candidates.push(SurveyCreatorCore.SvgRegistry);
        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            if (c && typeof c.registerIconFromSvg === "function") return c;
        }
        return null;
    }

    var iconName = "icon-file";
    try {
        var registry = findSvgRegistry();
        if (registry) {
            registry.registerIconFromSvg("gpx-question", GPX_ICON_SVG);
            iconName = "icon-gpx-question";
        }
    } catch (e) { /* fall back */ }
    window.__gpxQuestionIconName = iconName;

    // -------------------------------------------------------------------
    // 3b) Inline button icons (rendered inside the question's controls).
    //
    // We deliberately ship small, self-contained inline SVGs rather than
    // routing through the Creator's SvgRegistry (used for the toolbox
    // icon) because the runtime page does not always load
    // survey-creator-knockout — the SvgRegistry is only present in the
    // Creator. Inlining keeps the icons available in both contexts
    // without an extra asset request, and lets us style them via
    // `currentColor` so they inherit the surrounding text colour
    // (primary for "choose", danger for "clear").
    //
    // 24x24 viewBox so they render at a comfortable button glyph size
    // when the surrounding font-size resolves to ~16 px.
    // -------------------------------------------------------------------
    var GPX_UPLOAD_ICON_SVG =
        '<svg class="sjs-gpx__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 3a1 1 0 0 1 .707.293l5 5a1 1 0 0 1-1.414 1.414L13 6.414V15a1 1 0 1 1-2 0V6.414L7.707 9.707a1 1 0 0 1-1.414-1.414l5-5A1 1 0 0 1 12 3zM5 17a1 1 0 0 1 1 1v1c0 .551.449 1 1 1h10c.551 0 1-.449 1-1v-1a1 1 0 1 1 2 0v1a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1z"/>' +
        '</svg>';

    var GPX_CLEAR_ICON_SVG =
        '<svg class="sjs-gpx__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h.094l.852 12.142A2 2 0 0 0 7.94 21h8.118a2 2 0 0 0 1.994-1.858L18.906 7H19a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9zm1 2h4v0h-4V5zM7.099 7h9.802l-.842 12H7.941L7.099 7zM10 9a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1zm4 0a1 1 0 0 0-1 1v7a1 1 0 1 0 2 0v-7a1 1 0 0 0-1-1z"/>' +
        '</svg>';

    // -------------------------------------------------------------------
    // 3c) Built-in i18n for the choose / clear button labels.
    //
    // Acts as a backstop when the survey designer has not provided a
    // per-locale string via the Creator's Translation tab — in that
    // case `question.chooseFileButtonText` / `question.clearButtonText`
    // resolve to empty and `getButtonLabel` falls through to this table
    // keyed by `survey.locale` (which the CMS pushes via
    // `4_surveyJS.js`).
    //
    // Keys are SurveyJS locale codes (`en`, `de`, `fr`, …). The
    // `default` entry is used when `survey.locale` is empty (SurveyJS'
    // default state) or when no entry exists for the active locale.
    // To add a locale, just append a new key — no other code changes
    // required.
    // -------------------------------------------------------------------
    var DEFAULT_BUTTON_LABELS = {
        "default": { choose: "Choose GPX file", clear: "Clear" },
        "en":      { choose: "Choose GPX file", clear: "Clear" },
        "de":      { choose: "GPX-Datei wählen", clear: "Löschen" },
        "fr":      { choose: "Choisir un fichier GPX", clear: "Effacer" },
        "it":      { choose: "Scegli file GPX", clear: "Cancella" }
    };

    /**
     * Resolve the visible label / tooltip for one of the GPX question's
     * action buttons. `kind` is `"choose"` or `"clear"`.
     *
     * Resolution order in priority:
     *   1. SurveyJS-resolved per-locale string (`question[propName]`
     *      delegates through the `isLocalizable: true` machinery).
     *   2. Built-in `DEFAULT_BUTTON_LABELS[survey.locale][kind]`.
     *   3. English default.
     */
    function getButtonLabel(question, kind) {
        var propName = (kind === "clear") ? "clearButtonText" : "chooseFileButtonText";
        var custom = question && question[propName];
        if (typeof custom === "string" && custom.trim()) {
            return custom;
        }
        var locale = (question && question.survey && question.survey.locale) || "";
        var byLocale = (locale && DEFAULT_BUTTON_LABELS[locale]) ? DEFAULT_BUTTON_LABELS[locale] : null;
        if (byLocale && byLocale[kind]) return byLocale[kind];
        return DEFAULT_BUTTON_LABELS["default"][kind];
    }

    // -------------------------------------------------------------------
    // 4) GPX parsing helpers
    // -------------------------------------------------------------------

    var EARTH_RADIUS_M = 6371000;

    function toRadians(deg) { return (deg * Math.PI) / 180; }

    /**
     * Haversine distance in metres between two (lat, lon) pairs.
     */
    function haversine(lat1, lon1, lat2, lon2) {
        var dLat = toRadians(lat2 - lat1);
        var dLon = toRadians(lon2 - lon1);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_M * c;
    }

    /**
     * Parse a GPX XML string into an array of track points, flattening
     * across all <trk>/<trkseg> sections. Returns null when the file is
     * structurally invalid or contains no <trkpt> elements.
     */
    function parseGpx(xmlString) {
        if (typeof xmlString !== "string" || !xmlString.trim()) return null;
        var parser = new DOMParser();
        var doc;
        try {
            doc = parser.parseFromString(xmlString, "application/xml");
        } catch (e) { return null; }
        if (!doc) return null;
        // DOMParser signals XML errors as a <parsererror> root child.
        if (doc.getElementsByTagName("parsererror").length > 0) return null;
        var gpx = doc.documentElement;
        if (!gpx || gpx.nodeName.toLowerCase() !== "gpx") return null;

        // Collect ALL <trkpt> from every <trk>/<trkseg> in document order.
        var trkpts = doc.getElementsByTagName("trkpt");
        if (!trkpts || trkpts.length === 0) return null;

        var points = [];
        for (var i = 0; i < trkpts.length; i++) {
            var pt = trkpts[i];
            var lat = parseFloat(pt.getAttribute("lat"));
            var lon = parseFloat(pt.getAttribute("lon"));
            if (!isFinite(lat) || !isFinite(lon)) continue;
            var eleNode = pt.getElementsByTagName("ele")[0];
            var ele = eleNode ? parseFloat(eleNode.textContent) : NaN;
            if (!isFinite(ele)) ele = 0;
            points.push({ lat: lat, lon: lon, ele: ele });
        }
        if (points.length === 0) return null;

        // Metadata
        var nameNode = doc.querySelector("gpx > metadata > name") || doc.querySelector("gpx > trk > name");
        var timeNode = doc.querySelector("gpx > metadata > time");
        var name = nameNode ? (nameNode.textContent || "").trim() : null;
        var time = timeNode ? (timeNode.textContent || "").trim() : null;
        if (!name) name = null;
        if (!time) time = null;

        // Compute cumulative distance + elevation gain/loss.
        var totalDistanceM = 0;
        var elevationGainM = 0;
        var elevationLossM = 0;
        points[0].distanceFromStartM = 0;
        for (var j = 1; j < points.length; j++) {
            var d = haversine(points[j - 1].lat, points[j - 1].lon,
                              points[j].lat,     points[j].lon);
            totalDistanceM += d;
            points[j].distanceFromStartM = totalDistanceM;

            var dEle = points[j].ele - points[j - 1].ele;
            if (dEle > 0) elevationGainM += dEle;
            else if (dEle < 0) elevationLossM += -dEle;
        }

        return {
            name: name,
            time: time,
            points: points,
            totalDistanceM: totalDistanceM,
            elevationGainM: elevationGainM,
            elevationLossM: elevationLossM
        };
    }

    /**
     * Evenly-spaced index sampling. Always includes the first and last
     * index. `n` is the desired sample count and is clamped to
     * `[2, points.length]`.
     */
    function sampleIndices(total, n) {
        if (n < 2) n = 2;
        if (n > total) n = total;
        if (total <= n) {
            // No downsampling needed: return every index.
            var all = [];
            for (var i = 0; i < total; i++) all.push(i);
            return all;
        }
        var indices = [];
        for (var k = 0; k < n; k++) {
            // Map k in [0, n-1] -> idx in [0, total-1]
            var idx = Math.round((k * (total - 1)) / (n - 1));
            indices.push(idx);
        }
        return indices;
    }

    /**
     * Round a number to 6 decimals (matches the example payload).
     */
    function r6(v) {
        if (!isFinite(v)) return 0;
        return Math.round(v * 1e6) / 1e6;
    }

    /**
     * Round a number to 2 decimals.
     */
    function r2(v) {
        if (!isFinite(v)) return 0;
        return Math.round(v * 100) / 100;
    }

    /**
     * Round a number to 1 decimal.
     */
    function r1(v) {
        if (!isFinite(v)) return 0;
        return Math.round(v * 10) / 10;
    }

    /**
     * Round to integer (used for elevations, distances in metres).
     */
    function ri(v) {
        if (!isFinite(v)) return 0;
        return Math.round(v);
    }

    /**
     * Build the persisted payload for a parsed GPX.
     */
    function buildPayload(parsed, sampledCount) {
        var pts   = parsed.points;
        var total = parsed.totalDistanceM;

        // Compute hiking / biking estimates.
        // Hiking time uses a simple Naismith-style estimate: 5 km/h flat
        // plus 1 hour per 600 m climbed.
        // Biking uses a flat 15 km/h estimate.
        var totalKm    = total / 1000;
        var hikingFlat = totalKm / 5.0;
        var hikingClimb = parsed.elevationGainM / 600;
        var estimatedHikingTimeHours = hikingFlat + hikingClimb;
        var estimatedBikingTimeHours = totalKm / 15.0;

        var indices = sampleIndices(pts.length, sampledCount);
        var sampledPoints = indices.map(function (i) {
            var p = pts[i];
            return [r6(p.lat), r6(p.lon), ri(p.ele), ri(p.distanceFromStartM)];
        });

        var first = pts[0];
        var last  = pts[pts.length - 1];

        return {
            name: parsed.name,
            time: parsed.time,
            totalDistanceKm:          r2(totalKm),
            elevationGainM:           ri(parsed.elevationGainM),
            elevationLossM:           ri(parsed.elevationLossM),
            estimatedHikingTimeHours: r1(estimatedHikingTimeHours),
            estimatedBikingTimeHours: r1(estimatedBikingTimeHours),
            start: {
                lat: r6(first.lat),
                lon: r6(first.lon),
                ele: ri(first.ele),
                distanceFromStartM: 0
            },
            end: {
                lat: r6(last.lat),
                lon: r6(last.lon),
                ele: ri(last.ele),
                distanceFromStartM: ri(last.distanceFromStartM)
            },
            pointCountOriginal: pts.length,
            sampledPointCount:  sampledPoints.length,
            sampledPoints:      sampledPoints
        };
    }

    /**
     * Compute the effective field name SurveyJS uses to store the answer.
     * SurveyJS uses `valueName` when explicitly set, otherwise falls back
     * to `name`. The sibling file-metadata field is always
     * `<effectiveName>_file`.
     */
    function getEffectiveName(question) {
        if (!question) return "";
        if (typeof question.valueName === "string" && question.valueName) {
            return question.valueName;
        }
        return question.name || "";
    }

    function getFileFieldName(question) {
        var base = getEffectiveName(question);
        return base ? (base + "_file") : "";
    }

    // -------------------------------------------------------------------
    // 5) Server upload helpers
    // -------------------------------------------------------------------

    /**
     * Whether we are in the Creator / Designer preview where the survey
     * is NOT being submitted against the SelfHelp backend. We disable
     * server uploads in that case (Creator preview does the parse + map
     * locally only).
     */
    function isLocalOnlyContext(question) {
        var survey = question && question.survey;
        if (!survey) return true;
        if (survey.isDesignMode === true) return true;
        // The runtime container always has `.selfHelp-survey-js-holder` as
        // an ancestor in the DOM; the Creator preview iframe / panel does
        // not. We treat the absence of a recognised SelfHelp survey
        // container as "Creator preview".
        try {
            if (typeof document !== "undefined" && document.querySelector) {
                if (document.querySelector(".selfHelp-survey-js-holder")) return false;
            }
        } catch (e) { /* ignore */ }
        return true;
    }

    /**
     * POST a GPX file to the SelfHelp survey runtime controller.
     * Resolves to the saved `?file_path=...` URL on success.
     */
    function uploadGpxToServer(file, question) {
        return new Promise(function (resolve, reject) {
            var survey = question && question.survey;
            var responseId = survey && survey.data ? survey.data.response_id : null;
            var effectiveName = getEffectiveName(question);
            if (!responseId || !effectiveName) {
                reject(new Error("Survey response not initialised yet"));
                return;
            }
            var fd = new FormData();
            fd.append("upload_gpx", "1");
            fd.append("response_id", responseId);
            fd.append("question_name", effectiveName);
            fd.append(file.name, file, file.name);
            fetch(window.location.href, { method: "POST", body: fd })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (!data || data.status === "error") {
                        reject(new Error((data && data.error) || "Upload failed"));
                        return;
                    }
                    var path = data[file.name];
                    if (typeof path !== "string" || !path) {
                        reject(new Error("Upload returned no file path"));
                        return;
                    }
                    resolve(path);
                })
                .catch(function (err) { reject(err); });
        });
    }

    /**
     * Ask the server to delete a previously-uploaded GPX file by its
     * relative path (the `?file_path=…` portion the server returns from
     * upload). Best-effort: failures are swallowed.
     */
    function deleteGpxOnServer(filePath, question) {
        if (!filePath || typeof filePath !== "string") return Promise.resolve();
        var marker = "?file_path=";
        var rel = filePath.indexOf(marker) === 0 ? filePath.substring(marker.length) : filePath;
        try {
            var fd = new FormData();
            fd.append("delete_gpx", "1");
            fd.append("file_path", rel);
            return fetch(window.location.href, { method: "POST", body: fd })
                .then(function () { /* ignore body */ })
                .catch(function () { /* ignore */ });
        } catch (e) {
            return Promise.resolve();
        }
    }

    // -------------------------------------------------------------------
    // 6) Leaflet map preview
    // -------------------------------------------------------------------

    /**
     * Render (or re-render) the route preview inside `mapEl` from a
     * payload (parsed.sampledPoints). Cleans up any previously-created
     * map on the same element.
     */
    function renderMap(mapEl, payload) {
        if (!mapEl) return;
        if (typeof L === "undefined") {
            mapEl.textContent = "Map library is not loaded.";
            return;
        }
        if (!payload || !Array.isArray(payload.sampledPoints) || payload.sampledPoints.length === 0) {
            return;
        }

        // Tear down any prior instance bound to this DOM node.
        if (mapEl.__gpxLeafletMap && typeof mapEl.__gpxLeafletMap.remove === "function") {
            try { mapEl.__gpxLeafletMap.remove(); } catch (e) {}
            mapEl.__gpxLeafletMap = null;
        }

        mapEl.classList.add("sjs-gpx__map");
        // Leaflet refuses to mount on an element with zero height; set a
        // sensible default if the CSS has not yet kicked in.
        if (!mapEl.style.height) mapEl.style.height = "320px";

        var coords = payload.sampledPoints.map(function (p) { return [p[0], p[1]]; });
        var map = L.map(mapEl, { scrollWheelZoom: false });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        var polyline = L.polyline(coords, { color: "#2563eb", weight: 4, opacity: 0.85 }).addTo(map);
        L.marker(coords[0]).addTo(map).bindTooltip("Start");
        L.marker(coords[coords.length - 1]).addTo(map).bindTooltip("End");

        try { map.fitBounds(polyline.getBounds(), { padding: [20, 20] }); }
        catch (e) { map.setView(coords[0], 13); }

        mapEl.__gpxLeafletMap = map;
        // Leaflet sometimes mis-measures when the container becomes
        // visible after the map was created. Schedule an invalidate.
        setTimeout(function () {
            try { map.invalidateSize(); } catch (e) {}
        }, 100);
    }

    function destroyMap(mapEl) {
        if (!mapEl) return;
        if (mapEl.__gpxLeafletMap && typeof mapEl.__gpxLeafletMap.remove === "function") {
            try { mapEl.__gpxLeafletMap.remove(); } catch (e) {}
            mapEl.__gpxLeafletMap = null;
        }
        mapEl.innerHTML = "";
    }

    // -------------------------------------------------------------------
    // 7) Format helpers for the stats panel
    // -------------------------------------------------------------------

    function formatHours(h) {
        if (!isFinite(h) || h <= 0) return "—";
        var whole = Math.floor(h);
        var mins  = Math.round((h - whole) * 60);
        if (mins === 60) { whole += 1; mins = 0; }
        return whole + "h " + mins + "min";
    }

    /**
     * Render a GPX metadata <time> value as `DD-MM-YYYY` for the stats
     * panel ONLY. The persisted answer (question.value.time) keeps the
     * full original ISO-8601 string so analysts retain time-of-day,
     * timezone and second-level precision — only the on-screen render is
     * collapsed to a date.
     *
     * Strategy:
     *   1. Try the browser's `Date` constructor first; it accepts ISO-8601
     *      (`2024-09-29T13:00:00Z`), ISO date (`2024-09-29`), RFC2822 and
     *      a handful of locale strings.
     *   2. Fall back to a string-prefix match for `YYYY-MM-DD…` so even a
     *      malformed-but-recognisable ISO prefix renders as a date.
     *   3. As a last resort, return the raw string untouched (better to
     *      show something the user can compare against the file than to
     *      hide the value entirely).
     *
     * Returns `null` for null / empty input so the caller's "—" fallback
     * kicks in.
     */
    function formatGpxDate(value) {
        if (value === null || value === undefined) return null;
        var str = String(value).trim();
        if (!str) return null;
        var date = new Date(str);
        if (!isNaN(date.getTime())) {
            var dd   = String(date.getDate()).padStart(2, "0");
            var mm   = String(date.getMonth() + 1).padStart(2, "0");
            var yyyy = String(date.getFullYear());
            return dd + "-" + mm + "-" + yyyy;
        }
        var match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return match[3] + "-" + match[2] + "-" + match[1];
        }
        return str;
    }

    function renderStats(statsEl, payload) {
        if (!statsEl) return;
        if (!payload) { statsEl.innerHTML = ""; return; }
        var formattedTime = formatGpxDate(payload.time);
        var rows = [
            { label: "Name",           value: payload.name || "—" },
            { label: "Time",           value: formattedTime || "—" },
            { label: "Distance",       value: payload.totalDistanceKm + " km" },
            { label: "Elevation +",    value: payload.elevationGainM + " m" },
            { label: "Elevation −",    value: payload.elevationLossM + " m" },
            { label: "Hiking (est.)",  value: formatHours(payload.estimatedHikingTimeHours) },
            { label: "Biking (est.)",  value: formatHours(payload.estimatedBikingTimeHours) },
            { label: "Original pts.",  value: String(payload.pointCountOriginal) },
            { label: "Sampled pts.",   value: String(payload.sampledPointCount) }
        ];
        var html = '<table class="sjs-gpx__stats-table"><tbody>';
        for (var i = 0; i < rows.length; i++) {
            html += '<tr><th>' + rows[i].label + '</th><td>' + escapeHtml(rows[i].value) + '</td></tr>';
        }
        html += '</tbody></table>';
        statsEl.innerHTML = html;
    }

    function escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // -------------------------------------------------------------------
    // 8) Question lifecycle
    // -------------------------------------------------------------------

    function setQuestionError(question, message) {
        if (!question || typeof question.errors !== "object") return;
        clearQuestionError(question);
        try {
            if (typeof Survey.SurveyError === "function" && typeof question.addError === "function") {
                var err = new Survey.SurveyError(message, question);
                err.__fromGpxQuestion = true;
                question.addError(err);
            }
        } catch (e) { /* older builds */ }
    }

    function clearQuestionError(question) {
        if (!question || !Array.isArray(question.errors)) return;
        for (var i = question.errors.length - 1; i >= 0; i--) {
            if (question.errors[i] && question.errors[i].__fromGpxQuestion) {
                question.errors.splice(i, 1);
            }
        }
    }

    /**
     * Apply the file-field metadata (single-item array) to the sibling
     * question or — if no sibling question exists in the survey JSON —
     * to the survey's data hash directly so the value still survives
     * the next save cycle.
     */
    function setFileFieldValue(question, value) {
        var fileField = getFileFieldName(question);
        if (!fileField) return;
        var survey = question.survey;
        if (!survey) return;
        var siblingQ = (typeof survey.getQuestionByName === "function")
            ? survey.getQuestionByName(fileField) : null;
        if (siblingQ) {
            siblingQ.value = value;
        } else {
            if (value === undefined || value === null) {
                if (typeof survey.clearValue === "function") survey.clearValue(fileField);
            } else if (typeof survey.setValue === "function") {
                survey.setValue(fileField, value);
            }
        }
    }

    function getFileFieldValue(question) {
        var fileField = getFileFieldName(question);
        if (!fileField) return null;
        var survey = question.survey;
        if (!survey) return null;
        var siblingQ = (typeof survey.getQuestionByName === "function")
            ? survey.getQuestionByName(fileField) : null;
        if (siblingQ) return siblingQ.value;
        if (typeof survey.getValue === "function") return survey.getValue(fileField);
        return null;
    }

    // -------------------------------------------------------------------
    // 9) Widget definition
    // -------------------------------------------------------------------
    var widget = {
        name: COMPONENT_NAME,
        title: COMPONENT_TITLE,
        iconName: iconName,

        widgetIsLoaded: function () { return true; },

        isFit: function (question) {
            return question.getType() === COMPONENT_NAME;
        },

        activatedByChanged: function () { /* class registration done above */ },

        htmlTemplate:
            '<div class="sjs-gpx">' +
                '<div class="sjs-gpx__controls">' +
                    '<label class="sjs-gpx__file-label">' +
                        '<span class="sjs-gpx__file-button" role="button" tabindex="0">' +
                            GPX_UPLOAD_ICON_SVG +
                            '<span class="sjs-gpx__btn-text"></span>' +
                        '</span>' +
                        '<input type="file" accept=".gpx,application/gpx+xml" class="sjs-gpx__input" />' +
                    '</label>' +
                    '<span class="sjs-gpx__current"></span>' +
                    '<button type="button" class="sjs-gpx__clear" hidden>' +
                        GPX_CLEAR_ICON_SVG +
                        '<span class="sjs-gpx__btn-text"></span>' +
                    '</button>' +
                '</div>' +
                '<div class="sjs-gpx__error" role="alert" hidden></div>' +
                '<div class="sjs-gpx__status" role="status" hidden></div>' +
                '<div class="sjs-gpx__preview">' +
                    '<div class="sjs-gpx__map"></div>' +
                    '<div class="sjs-gpx__stats"></div>' +
                '</div>' +
            '</div>',

        afterRender: function (question, el) {
            var input        = el.querySelector(".sjs-gpx__input");
            var current      = el.querySelector(".sjs-gpx__current");
            var clearBtn     = el.querySelector(".sjs-gpx__clear");
            var fileBtn      = el.querySelector(".sjs-gpx__file-button");
            var fileBtnText  = fileBtn  ? fileBtn.querySelector(".sjs-gpx__btn-text")  : null;
            var clearBtnText = clearBtn ? clearBtn.querySelector(".sjs-gpx__btn-text") : null;
            var errorEl      = el.querySelector(".sjs-gpx__error");
            var statusEl     = el.querySelector(".sjs-gpx__status");
            var mapEl        = el.querySelector(".sjs-gpx__map");
            var statsEl      = el.querySelector(".sjs-gpx__stats");

            // Apply localized labels + tooltips to the action buttons.
            // Called on initial render AND whenever the survey locale
            // changes or the designer edits the localizable props.
            function applyButtonLabels() {
                var chooseLabel = getButtonLabel(question, "choose");
                var clearLabel  = getButtonLabel(question, "clear");
                if (fileBtnText)  fileBtnText.textContent  = chooseLabel;
                if (clearBtnText) clearBtnText.textContent = clearLabel;
                if (fileBtn)  fileBtn.setAttribute("title",  chooseLabel);
                if (clearBtn) clearBtn.setAttribute("title", clearLabel);
                if (fileBtn)  fileBtn.setAttribute("aria-label",  chooseLabel);
                if (clearBtn) clearBtn.setAttribute("aria-label", clearLabel);
            }
            applyButtonLabels();

            // Re-apply the labels whenever the survey locale changes at
            // runtime (multilingual surveys with a language switcher) or
            // whenever the designer edits the localizable props in the
            // Creator's property / Translation panels.
            var localeHandler = null;
            var survey = question.survey;
            if (survey && survey.onLocaleChanged && typeof survey.onLocaleChanged.add === "function") {
                localeHandler = function () { applyButtonLabels(); };
                survey.onLocaleChanged.add(localeHandler);
            }
            if (typeof question.registerFunctionOnPropertyValueChanged === "function") {
                question.registerFunctionOnPropertyValueChanged(
                    "chooseFileButtonText", applyButtonLabels, "gpxQuestionChooseLabel"
                );
                question.registerFunctionOnPropertyValueChanged(
                    "clearButtonText", applyButtonLabels, "gpxQuestionClearLabel"
                );
            }
            // Keep the handler around so willUnmount can detach it.
            el.__gpxLocaleHandler = localeHandler;

            // Treat Enter / Space on the visible "choose" pseudo-button
            // as a click on the underlying file input. Without this the
            // label-wrapped <span> is keyboard-reachable (we made it
            // tabbable) but produces no action because the native click
            // synthesis only fires for <button> / <a>.
            if (fileBtn) {
                fileBtn.addEventListener("keydown", function (ev) {
                    if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
                        ev.preventDefault();
                        if (input && typeof input.click === "function") input.click();
                    }
                });
            }

            function showError(msg) {
                errorEl.textContent = msg || "";
                errorEl.hidden = !msg;
                if (msg) setQuestionError(question, msg);
                else     clearQuestionError(question);
            }
            function showStatus(msg) {
                statusEl.textContent = msg || "";
                statusEl.hidden = !msg;
            }

            function renderFromPayload(payload, fileMeta) {
                if (!payload) {
                    destroyMap(mapEl);
                    statsEl.innerHTML = "";
                    current.textContent = "";
                    clearBtn.hidden = true;
                    return;
                }
                renderMap(mapEl, payload);
                renderStats(statsEl, payload);
                if (fileMeta && fileMeta.name) {
                    current.textContent = fileMeta.name;
                } else if (payload.name) {
                    current.textContent = payload.name + " (.gpx)";
                } else {
                    current.textContent = "GPX route";
                }
                clearBtn.hidden = false;
            }

            // Initial render from previously-saved value (restore path).
            function restoreFromValue() {
                var v = question.value;
                if (v && typeof v === "object" && Array.isArray(v.sampledPoints) && v.sampledPoints.length > 0) {
                    var fileField = getFileFieldValue(question);
                    var fileMeta = (Array.isArray(fileField) && fileField.length > 0) ? fileField[0] : null;
                    renderFromPayload(v, fileMeta);
                    showError(null);
                } else {
                    renderFromPayload(null, null);
                }
            }
            restoreFromValue();

            // File-input change handler. The full happy path:
            //   1. Validate extension (.gpx).
            //   2. Read file as text.
            //   3. Parse GPX. On failure, set question-level error.
            //   4. Build payload.
            //   5. Upload to the server (skipped in Creator preview).
            //   6. On upload success, set main answer + sibling file field.
            //   7. Render map + stats.
            input.addEventListener("change", function () {
                showError(null);
                showStatus(null);
                var file = input.files && input.files[0];
                if (!file) return;
                var lower = (file.name || "").toLowerCase();
                if (!/\.gpx$/.test(lower)) {
                    showError("Only .gpx files are accepted.");
                    input.value = "";
                    return;
                }
                showStatus("Parsing GPX…");
                var reader = new FileReader();
                reader.onerror = function () {
                    showError("Could not read the file.");
                    showStatus(null);
                    input.value = "";
                };
                reader.onload = function () {
                    var text = String(reader.result || "");
                    var parsed = parseGpx(text);
                    if (!parsed) {
                        showError("The file is not a valid GPX track (no <trkpt> points found).");
                        showStatus(null);
                        input.value = "";
                        return;
                    }
                    var n = parseInt(question.sampledPointCount, 10);
                    if (!isFinite(n) || n < 2) n = 100;
                    var payload = buildPayload(parsed, n);

                    // Replace flow: delete the previously-uploaded file
                    // BEFORE re-uploading the new one, so disk usage
                    // doesn't accumulate across replacements.
                    var prev = getFileFieldValue(question);
                    if (Array.isArray(prev) && prev.length > 0 && prev[0] && prev[0].content) {
                        deleteGpxOnServer(prev[0].content, question);
                    }

                    if (isLocalOnlyContext(question)) {
                        // Creator preview / Test tab: do not upload to
                        // the server. Show the parsed payload locally.
                        question.value = payload;
                        setFileFieldValue(question, [{
                            name: file.name,
                            type: file.type || "application/gpx+xml",
                            content: ""    // no server-side link in Creator
                        }]);
                        renderFromPayload(payload, { name: file.name });
                        showStatus(null);
                        input.value = "";
                        return;
                    }

                    showStatus("Uploading GPX…");
                    uploadGpxToServer(file, question)
                        .then(function (savedPath) {
                            question.value = payload;
                            setFileFieldValue(question, [{
                                name: file.name,
                                type: file.type || "application/gpx+xml",
                                content: savedPath
                            }]);
                            renderFromPayload(payload, { name: file.name });
                            showStatus(null);
                            input.value = "";
                        })
                        .catch(function (err) {
                            showError("Upload failed: " + (err && err.message ? err.message : "unknown error"));
                            showStatus(null);
                            input.value = "";
                        });
                };
                reader.readAsText(file);
            });

            // Clear button. Wipes both fields and deletes the uploaded
            // file from the server (best-effort).
            clearBtn.addEventListener("click", function (e) {
                e.preventDefault();
                var prev = getFileFieldValue(question);
                if (Array.isArray(prev) && prev.length > 0 && prev[0] && prev[0].content) {
                    deleteGpxOnServer(prev[0].content, question);
                }
                question.clearValue();
                setFileFieldValue(question, undefined);
                renderFromPayload(null, null);
                showError(null);
                showStatus(null);
                input.value = "";
            });

            // External value changes (e.g. logic actions, restore on
            // page change) should refresh the preview.
            question.valueChangedCallback = function () { restoreFromValue(); };

            // Property change: re-sampling when sampledPointCount is
            // adjusted in the Creator should re-render the preview if
            // we still have the original points available (we only kept
            // the sampled set, so we just re-render from the existing
            // value rather than re-sampling — the persisted value is
            // already the contract).
            if (typeof question.registerFunctionOnPropertyValueChanged === "function") {
                question.registerFunctionOnPropertyValueChanged("sampledPointCount", function () {
                    // No-op on already-uploaded data: the contract says
                    // sampledPointCount drives FUTURE uploads only.
                }, "gpxQuestionSampledPointCount");
            }
        },

        willUnmount: function (question, el) {
            if (!el || typeof el.querySelector !== "function") return;
            var mapEl = el.querySelector(".sjs-gpx__map");
            destroyMap(mapEl);
            if (question && typeof question.unRegisterFunctionOnPropertyValueChanged === "function") {
                try { question.unRegisterFunctionOnPropertyValueChanged("sampledPointCount", "gpxQuestionSampledPointCount"); } catch (e) {}
                try { question.unRegisterFunctionOnPropertyValueChanged("chooseFileButtonText", "gpxQuestionChooseLabel"); } catch (e) {}
                try { question.unRegisterFunctionOnPropertyValueChanged("clearButtonText", "gpxQuestionClearLabel"); } catch (e) {}
            }
            // Detach the survey-level locale-change listener we
            // installed in afterRender so we don't leak callbacks across
            // page changes / question rebuilds.
            try {
                var survey = question && question.survey;
                var handler = el.__gpxLocaleHandler;
                if (handler && survey && survey.onLocaleChanged &&
                    typeof survey.onLocaleChanged.remove === "function") {
                    survey.onLocaleChanged.remove(handler);
                }
                el.__gpxLocaleHandler = null;
            } catch (e) { /* ignore */ }
            if (question) {
                try { question.valueChangedCallback = null; } catch (e) {}
            }
        }
    };

    if (Survey.CustomWidgetCollection &&
        Survey.CustomWidgetCollection.Instance &&
        !Survey.CustomWidgetCollection.Instance.getCustomWidgetByName(COMPONENT_NAME)) {
        Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");
    }
})();
