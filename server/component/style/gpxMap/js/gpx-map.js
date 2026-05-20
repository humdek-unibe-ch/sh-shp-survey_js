/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * gpxMap style renderer (plugin v1.5.0+).
 *
 * Mounts a Leaflet/OpenStreetMap preview on every `.sjs-gpx-map-style`
 * container the server emitted. Each container carries its sample
 * points in a `data-sample-points` attribute as JSON-encoded text;
 * the script normalises three legal shapes (bare array, `gpx`-style
 * answer object, `null`/empty) and draws a polyline + start/end
 * markers identical to the GPX SurveyJS question's preview.
 *
 * Why a separate renderer from `7_gpxQuestionWidget.js`?
 * ------------------------------------------------------
 * The GPX question widget is wired into the SurveyJS runtime via
 * `Survey.CustomWidgetCollection`; it cannot run outside a survey
 * because its lifecycle (afterRender / willUnmount) is owned by
 * SurveyJS. The `gpxMap` style needs to render on plain pages and
 * inside containers that have nothing to do with SurveyJS, so it
 * gets its own thin renderer that re-uses the same Leaflet vendor
 * bundle and the same visual contract.
 *
 * Data shapes accepted on `data-sample-points`
 * --------------------------------------------
 *   1. Bare array:   [[lat, lon], [lat, lon, ele, distM], …]
 *   2. Object:       { name, time, sampledPoints: [...], … }
 *                    (the persisted shape of the `gpx` question's
 *                     main answer — designers can interpolate the
 *                     whole answer row via {{gpx_route}} and we
 *                     unwrap it here).
 *   3. Empty / null: nothing drawn, "no route data" hint shown.
 */
(function initGpxMapStyle() {
    "use strict";

    var SELECTOR = ".sjs-gpx-map-style";

    /**
     * Coerce whatever the data attribute carried (string, object,
     * array, undefined) into a `[[lat, lon, …], …]` array. Returns
     * an empty array when no usable points were found.
     */
    function extractSampledPoints(raw) {
        if (raw === null || raw === undefined || raw === "") return [];
        var value = raw;
        // The attribute is a JSON-encoded string until we parse it.
        if (typeof value === "string") {
            var trimmed = value.trim();
            if (!trimmed) return [];
            try {
                value = JSON.parse(trimmed);
            } catch (e) {
                return [];
            }
        }
        if (Array.isArray(value)) {
            // Already a points array. Keep only well-formed
            // [lat, lon, …] entries so a stray null in the payload
            // doesn't crash Leaflet.
            return value.filter(function (p) {
                return Array.isArray(p) && p.length >= 2 &&
                    isFinite(p[0]) && isFinite(p[1]);
            });
        }
        if (value && typeof value === "object" && Array.isArray(value.sampledPoints)) {
            return value.sampledPoints.filter(function (p) {
                return Array.isArray(p) && p.length >= 2 &&
                    isFinite(p[0]) && isFinite(p[1]);
            });
        }
        return [];
    }

    /**
     * Render (or re-render) the Leaflet preview inside `container`.
     * Tears down any prior map bound to the same DOM node so calling
     * this twice on the same container (e.g. after a logic update
     * swapped the data attribute) is safe.
     */
    function renderContainer(container) {
        if (!container || container.__gpxMapStyleRendered) return;
        if (typeof L === "undefined") return;

        var mapEl   = container.querySelector(".sjs-gpx-map-style__map");
        var emptyEl = container.querySelector(".sjs-gpx-map-style__empty");
        if (!mapEl) return;

        var raw    = container.getAttribute("data-sample-points");
        var points = extractSampledPoints(raw);

        // Tear down any previous Leaflet instance attached to this
        // map node before we either re-render or fall through to the
        // empty-state branch.
        if (mapEl.__gpxMapStyleInstance && typeof mapEl.__gpxMapStyleInstance.remove === "function") {
            try { mapEl.__gpxMapStyleInstance.remove(); } catch (e) {}
            mapEl.__gpxMapStyleInstance = null;
        }

        if (!points.length) {
            mapEl.style.display = "none";
            if (emptyEl) emptyEl.hidden = false;
            container.__gpxMapStyleRendered = true;
            return;
        }

        if (emptyEl) emptyEl.hidden = true;
        mapEl.style.display = "";

        // Leaflet refuses to mount on a zero-height element; the CSS
        // pins a min-height but be defensive in case the host stripped
        // it via a custom override.
        if (!mapEl.style.height && !mapEl.offsetHeight) {
            mapEl.style.height = "360px";
        }

        var coords = points.map(function (p) { return [p[0], p[1]]; });

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

        mapEl.__gpxMapStyleInstance = map;
        // Leaflet sometimes mis-measures when the container becomes
        // visible after construction (e.g. inside an accordion).
        // Schedule one invalidate-size pass to catch that case.
        setTimeout(function () {
            try { map.invalidateSize(); } catch (e) {}
        }, 100);
        container.__gpxMapStyleRendered = true;
    }

    /**
     * Discover every gpxMap container currently in the DOM and
     * render each one. Called both on initial page load and from
     * the MutationObserver below (so dynamically-inserted maps —
     * e.g. inside a logic-driven section toggle — also get wired).
     */
    function renderAll(root) {
        var scope = root && root.querySelectorAll ? root : document;
        var nodes = scope.querySelectorAll(SELECTOR);
        for (var i = 0; i < nodes.length; i++) {
            renderContainer(nodes[i]);
        }
    }

    function onReady() {
        renderAll(document);

        // Observe future additions so containers inserted later
        // (e.g. via AJAX swaps or section visibility toggles) still
        // get rendered. The `__gpxMapStyleRendered` flag inside
        // `renderContainer` makes the call idempotent.
        if (typeof MutationObserver === "function") {
            var observer = new MutationObserver(function (mutations) {
                for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    for (var j = 0; j < m.addedNodes.length; j++) {
                        var node = m.addedNodes[j];
                        if (node.nodeType !== 1) continue;
                        if (node.matches && node.matches(SELECTOR)) {
                            renderContainer(node);
                        } else if (node.querySelectorAll) {
                            renderAll(node);
                        }
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", onReady);
    } else {
        onReady();
    }
})();
