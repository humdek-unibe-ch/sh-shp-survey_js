/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Video Segment custom SurveyJS question widget (v1.4.7).
 *
 * Built against SurveyJS v1.9.124 (do NOT upgrade).
 *
 * Why a standalone class (NOT extending the built-in `image` question)?
 * --------------------------------------------------------------------
 * An earlier iteration of this widget extended the `image` question
 * (`addClass(..., null, "image")`). That broke things in three ways:
 *   1. The image question's native renderer rendered the question instead
 *      of our custom widget, so the segment was NEVER clamped to
 *      `[start, end]` and the full video played.
 *   2. The image renderer used `imageLink` as-is, bypassing our
 *      `resolveVideoUrl()` helper, so SelfHelp-relative paths like
 *      `/assets/video.mp4` were not prefixed with BASE_PATH and produced
 *      404s when SelfHelp was mounted at a sub-path.
 *   3. The image renderer's "no value" placeholder offered drag-and-drop
 *      file upload, which is exactly the affordance we need to forbid.
 *
 * The class therefore inherits from `empty` (no built-in renderer) and
 * the custom widget's `htmlTemplate` is the sole source of truth for
 * how a `videoSegment` question is drawn. The `<video>` element with
 * native controls is the only UI; configuration is in the property panel.
 *
 * Property surface
 * ----------------
 *   videoUrl        (string, required)            -> "Video URL"
 *   startTimestamp  (number, required, >= 0)      -> "Start timestamp (seconds)"
 *   endTimestamp    (number, required, > start)   -> "End timestamp (seconds)"
 *   videoFit        ("none"|"contain"|"cover"|"fill", default "contain") -> "Video fit"
 *   videoHeight     (CSS string, default "")      -> "Video height (CSS-accepted values)"
 *   videoWidth      (CSS string, default "")      -> "Video width (CSS-accepted values)"
 *
 * URL resolution
 * --------------
 *   "https://..."                  -> unchanged
 *   "//cdn..."                     -> unchanged (protocol-relative)
 *   "data:..."                     -> unchanged (data URI)
 *   "/assets/video.mp4"            -> "<BASE_PATH>/assets/video.mp4"
 *   "assets/video.mp4"             -> unchanged (page-relative)
 *
 * BASE_PATH is exposed to JS via `window.SELFHELP_BASE_PATH`, set by
 * `4_surveyJS.js` from the `data-survey-js-fields` attribute, which is
 * populated by `SurveyJSView::output_content()` from the PHP `BASE_PATH`
 * constant.
 *
 * Question value
 * --------------
 * When the segment is fully watched (natural playback or seek-clamped to
 * `endTimestamp`), the widget assigns:
 *
 *   { watched: true, currentTime: <end>, completedAt: <ISO>, reason: "ended"|"clamp" }
 *
 * This is purely auto-generated metadata; there is no `defaultValue` /
 * `correctAnswer` editor exposed in the property panel.
 */
(function registerVideoSegmentWidget() {
    "use strict";

    if (typeof Survey === "undefined" || !Survey || !Survey.Serializer) {
        return;
    }

    /*
     * IMPORTANT — SurveyJS v1.9.124 LOWERCASES every class name.
     *
     * Inside survey-core, `JsonMetadata.addClass(name, ...)` does:
     *
     *     name = name.toLowerCase();
     *     this.classes[name] = new JsonMetadataClass(name, ...);
     *
     * which means the registered class object's own `name` is the
     * lowercased string, and every Question instance constructed from it
     * returns the lowercased value from `getType()`. `findClass(name)`
     * also lowercases its argument before lookup.
     *
     * The "right" canonical name to compare against (in `isFit`, in the
     * survey JSON, in the toolbox `name` field, etc.) is therefore the
     * LOWERCASED name. We keep a separate camelCase title only for
     * user-facing display via Survey.surveyLocalization / editorLocalization.
     *
     * If you forget this, isFit() never matches, the custom widget is
     * never attached, and the question card renders an empty <div>.
     */
    var COMPONENT_NAME  = "videosegment";   // canonical lowercased type
    var COMPONENT_TITLE = "Video Segment";  // human-facing display label

    // -------------------------------------------------------------------
    // 1) Class registration
    // -------------------------------------------------------------------
    if (!Survey.Serializer.findClass(COMPONENT_NAME)) {
        Survey.Serializer.addClass(
            COMPONENT_NAME,
            [
                {
                    name: "videoUrl:string",
                    isRequired: true,
                    category: "general",
                    displayName: "Video URL"
                },
                {
                    name: "startTimestamp:number",
                    isRequired: true,
                    default: 0,
                    minValue: 0,
                    category: "general",
                    displayName: "Start timestamp (seconds)"
                },
                {
                    name: "endTimestamp:number",
                    isRequired: true,
                    default: 30,
                    minValue: 0,
                    category: "general",
                    displayName: "End timestamp (seconds)"
                },
                /*
                 * "Video fit" / height / width — replicated (with `video*`
                 * names so the property panel reads "Video ...") and wired
                 * to the <video> element via inline style + object-fit.
                 *
                 * Default is "contain" because that's what most users
                 * expect for a video player (fit inside without distortion).
                 */
                {
                    name: "videoFit",
                    default: "contain",
                    choices: ["none", "contain", "cover", "fill"],
                    category: "layout",
                    displayName: "Video fit"
                },
                {
                    name: "videoHeight:string",
                    default: "",
                    category: "layout",
                    displayName: "Video height (CSS-accepted values)"
                },
                {
                    name: "videoWidth:string",
                    default: "",
                    category: "layout",
                    displayName: "Video width (CSS-accepted values)"
                }
            ],
            null,
            "empty"   // <-- standalone, NOT "image"
        );

        // Call directly on the singleton so `this` resolves correctly. If
        // we extract `var f = Survey.ElementFactory.Instance.registerCustomQuestion`
        // and call `f(...)`, `this` is undefined and the registration
        // silently no-ops in strict mode.
        if (Survey.ElementFactory && Survey.ElementFactory.Instance &&
            typeof Survey.ElementFactory.Instance.registerCustomQuestion === "function") {
            Survey.ElementFactory.Instance.registerCustomQuestion(COMPONENT_NAME);
        }
    }

    // -------------------------------------------------------------------
    // 2) Localized question-type display name.
    //
    // The Creator's question card has a dropdown showing the current type;
    // by default it falls back to `type.toLowerCase()` -> "videosegment"
    // (one word, hard to read). The label is read from
    //   - Survey.surveyLocalization.locales[<loc>].qt[<type>]                (runtime / Creator preview)
    //   - SurveyCreator.editorLocalization.locales[<loc>].qt[<type>]         (Creator UI in some builds)
    //
    // We unconditionally write to BOTH (and fall back to top-level locale
    // strings when `qt` is absent) because the exact path varies between
    // survey-creator-knockout v1.8.x and v1.9.x.
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
        // Some builds also keep a `defaultLocale` reference; make sure that
        // path is seeded too.
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
    // Some survey-creator-knockout builds expose `localization` instead of
    // `editorLocalization`; same data, different namespace.
    if (typeof SurveyCreator !== "undefined" && SurveyCreator.localization && SurveyCreator.localization.locales) {
        setQuestionTypeName(SurveyCreator.localization, COMPONENT_NAME, COMPONENT_TITLE);
    }

    // -------------------------------------------------------------------
    // 3) Toolbox icon.
    //
    // We expose the resolved icon name via window.__videoSegmentIconName so
    // 8_survey.js can use whichever icon actually exists in this build of
    // survey-creator-knockout. We try, in order:
    //   a) Register a custom video-camera SVG via SurveyCreator.SvgRegistry
    //   b) Fall back to the built-in "icon-image" (always present).
    //
    // SurveyCreator.SvgRegistry has been part of survey-creator-core since
    // v1.8.x but has been re-exported under different paths in different
    // packagings (knockout vs. core). We probe several known locations.
    // -------------------------------------------------------------------
    var VIDEO_ICON_SVG =
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M17 10.5V6.75A1.75 1.75 0 0 0 15.25 5h-11.5A1.75 1.75 0 0 0 2 6.75v10.5C2 18.216 2.784 19 3.75 19h11.5A1.75 1.75 0 0 0 17 17.25V13.5l4.7 3.86a.75.75 0 0 0 1.3-.58V7.22a.75.75 0 0 0-1.3-.58L17 10.5z"/>' +
        '</svg>';

    function findSvgRegistry() {
        var candidates = [];
        if (typeof SurveyCreator !== "undefined") {
            candidates.push(SurveyCreator.SvgRegistry);
            if (SurveyCreator.SurveyCreator) candidates.push(SurveyCreator.SurveyCreator.SvgRegistry);
        }
        if (typeof Survey !== "undefined") {
            candidates.push(Survey.SvgRegistry);
        }
        if (typeof SurveyCreatorCore !== "undefined") {
            candidates.push(SurveyCreatorCore.SvgRegistry);
        }
        for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            if (c && typeof c.registerIconFromSvg === "function") return c;
        }
        return null;
    }

    var iconName = "icon-image"; // safe fallback that always exists
    try {
        var registry = findSvgRegistry();
        if (registry) {
            // SvgRegistry expects the icon name without the "icon-" prefix.
            registry.registerIconFromSvg("video-segment", VIDEO_ICON_SVG);
            iconName = "icon-video-segment";
        }
    } catch (e) {
        // keep fallback
    }
    window.__videoSegmentIconName = iconName;

    // -------------------------------------------------------------------
    // 4) Helpers
    // -------------------------------------------------------------------

    /** Coerce arbitrary input into a finite non-negative number, or null. */
    function parseSeconds(value) {
        if (value === null || value === undefined || value === "") return null;
        if (typeof value === "number") return isFinite(value) ? value : null;
        var parsed = parseFloat(value);
        return isFinite(parsed) ? parsed : null;
    }

    /**
     * Resolve a (possibly relative) URL the survey designer typed into the
     * `videoUrl` property. See file header for the resolution rules.
     */
    function resolveVideoUrl(rawUrl) {
        if (typeof rawUrl !== "string") return rawUrl;
        var url = rawUrl.trim();
        if (!url) return url;

        // Absolute URL ("http:", "https:", "data:", "blob:", "file:", ...)
        // or protocol-relative ("//cdn.example.com/..."). Pass through.
        if (/^[a-z][a-z0-9+.\-]*:/i.test(url)) return url;
        if (url.indexOf("//") === 0) return url;

        // Root-relative -> prefix with BASE_PATH.
        if (url.charAt(0) === "/") {
            var basePath = (typeof window !== "undefined" && typeof window.SELFHELP_BASE_PATH === "string")
                ? window.SELFHELP_BASE_PATH
                : "";
            if (!basePath) return url;
            // Idempotency: do not double-prefix if already correct.
            if (url === basePath || url.indexOf(basePath + "/") === 0) {
                return url;
            }
            return basePath.replace(/\/+$/, "") + url;
        }
        // Page-relative: leave alone, browser resolves.
        return url;
    }

    function getConfigError(question) {
        var url   = question.videoUrl;
        var start = parseSeconds(question.startTimestamp);
        var end   = parseSeconds(question.endTimestamp);

        if (!url || (typeof url === "string" && !url.trim())) {
            return "Video URL is required";
        }
        if (start === null) return "startTimestamp is required and must be a number";
        if (end   === null) return "endTimestamp is required and must be a number";
        if (start < 0 || end < 0) return "Timestamps must be greater than or equal to 0";
        if (start >= end) return "startTimestamp must be strictly less than endTimestamp";
        return null;
    }

    /**
     * Apply the videoFit / videoHeight / videoWidth properties to the DOM.
     * Called both from afterRender and from property-change callbacks so
     * editing the layout in the Creator updates the preview live.
     */
    function applyLayout(video, question) {
        var fit = (question.videoFit || "contain").toString();
        // Whitelist allowed values to keep CSS sane.
        var allowed = { none: 1, contain: 1, cover: 1, fill: 1 };
        video.style.objectFit = allowed[fit] ? fit : "contain";

        // Empty string -> remove inline override so the CSS default kicks in.
        if (question.videoHeight) {
            video.style.height = String(question.videoHeight);
        } else {
            video.style.removeProperty("height");
        }
        if (question.videoWidth) {
            video.style.width = String(question.videoWidth);
        } else {
            video.style.removeProperty("width");
        }
    }

    /**
     * Wire up an HTML5 <video> element so it strictly enforces the
     * [start, end] playback window AND records the current playback state
     * in the question's value. Returns a cleanup function.
     *
     * Question value schema (always assigned, even on partial playback):
     *
     *   {
     *     watched:        boolean,       // true once the user reached `end`
     *     currentTime:    number,        // last observed currentTime, clamped to [start, end]
     *     startTimestamp: number,        // segment start (echoed for audits)
     *     endTimestamp:  number,         // segment end   (echoed for audits)
     *     duration:       number,        // (end - start)
     *     watchedSeconds: number,        // wall-clock seconds actually played, seeks excluded
     *     percentWatched: number,        // 0..1, watchedSeconds / duration
     *     startedAt:     ISO-8601 string,// first time the user pressed play
     *     lastUpdatedAt: ISO-8601 string,// last event timestamp
     *     lastEvent:     "play"|"pause"|"seek"|"ended"|"clamp",
     *     completedAt:   ISO-8601 string|null  // set the moment `watched` became true
     *   }
     *
     * No per-event log is kept (we explicitly removed it because the
     * cumulative "watched / lastEvent / currentTime" snapshot already
     * answers every question we have today and a per-event array makes
     * survey responses needlessly large).
     */
    function attachPlaybackEnforcement(video, question, start, end) {
        var enforcing       = false;
        var watchedSeconds  = 0;
        var lastTickAt      = null;       // wall-clock of the previous timeupdate
        var startedAt       = null;       // ISO of the very first "play"
        var completedAt     = null;       // ISO of the moment watched became true
        var duration        = end - start;

        function safeISO() {
            try { return new Date().toISOString(); } catch (e) { return null; }
        }

        /**
         * Persist the current playback state back to the question's value.
         * Called from every meaningful event handler so the survey JSON
         * always reflects "where the user was" — not only the final state.
         *
         * SurveyJS triggers a re-render on each value assignment, but only
         * shallow-compares the previous and new values. We assign a fresh
         * object literal each time so the change is detected.
         */
        function persistState(eventType) {
            try {
                var t = video.currentTime;
                var watched = t >= end - 0.05;
                if (watched && !completedAt) completedAt = safeISO();

                question.value = {
                    watched:        watched,
                    currentTime:    Math.max(start, Math.min(end, t)),
                    startTimestamp: start,
                    endTimestamp:   end,
                    duration:       duration,
                    watchedSeconds: Math.round(watchedSeconds * 1000) / 1000,
                    percentWatched: duration > 0 ? Math.min(1, watchedSeconds / duration) : 0,
                    startedAt:      startedAt,
                    lastUpdatedAt:  safeISO(),
                    lastEvent:      eventType,
                    completedAt:    completedAt
                };
            } catch (e) { /* ignore */ }
        }

        var onLoadedMetadata = function () {
            // Snap to the segment start so the timeline thumb is in the
            // right place from the get-go. Do NOT record this as an event;
            // it's an automatic positioning step.
            enforcing = true;
            video.currentTime = start;
            enforcing = false;
        };

        // --- watch-time accounting --------------------------------------
        // We sample wall-clock between consecutive `timeupdate` events
        // (which fire ~4x/s) and add the elapsed time to `watchedSeconds`
        // only while the video is actually playing inside the segment.
        // This avoids over-counting for seeks (which fire timeupdate but
        // have a huge wall-clock delta).
        var onTimeUpdate = function () {
            if (enforcing) return;
            if (!video.paused && !video.ended) {
                var now = Date.now();
                if (lastTickAt) {
                    var deltaSeconds = (now - lastTickAt) / 1000;
                    if (deltaSeconds > 0 && deltaSeconds < 1.0) {
                        watchedSeconds += deltaSeconds;
                        if (watchedSeconds > duration) watchedSeconds = duration;
                    }
                }
                lastTickAt = now;
            } else {
                lastTickAt = null;
            }
            // Hard-stop: pause exactly at `end`.
            if (video.currentTime >= end) {
                enforcing = true;
                video.currentTime = end;
                video.pause();
                enforcing = false;
                persistState("ended");
            }
        };

        var onSeek = function () {
            if (enforcing) return;
            var t = video.currentTime;
            // Reset watch-rate accounting; the wall-clock delta across a
            // seek is meaningless.
            lastTickAt = null;
            if (t < start) {
                enforcing = true;
                video.currentTime = start;
                enforcing = false;
                persistState("seek");
                return;
            }
            if (t > end) {
                enforcing = true;
                video.currentTime = end;
                if (!video.paused) video.pause();
                enforcing = false;
                persistState("clamp");
                return;
            }
            persistState("seek");
        };

        var onPlay = function () {
            if (enforcing) return;
            // Replay snap-back: pressing play after reaching the end
            // restarts at `start`.
            if (video.currentTime >= end - 0.05 || video.currentTime < start) {
                enforcing = true;
                video.currentTime = start;
                enforcing = false;
            }
            if (!startedAt) startedAt = safeISO();
            lastTickAt = Date.now();
            persistState("play");
        };

        var onPause = function () {
            if (enforcing) return;
            // The browser fires a "pause" event right before "ended" and
            // again when we clamp at `end`; skip if we're at the end so
            // we don't double-record over the natural-end event.
            if (video.currentTime >= end - 0.05) return;
            lastTickAt = null;
            persistState("pause");
        };

        var onEnded = function () {
            enforcing = true;
            video.currentTime = start;
            enforcing = false;
            // Re-record so `watched` and `completedAt` survive the rewind.
            persistState("ended");
        };

        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("seeking", onSeek);
        video.addEventListener("seeked",  onSeek);
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("play", onPlay);
        video.addEventListener("pause", onPause);
        video.addEventListener("ended", onEnded);

        return function detach() {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("seeking", onSeek);
            video.removeEventListener("seeked",  onSeek);
            video.removeEventListener("timeupdate", onTimeUpdate);
            video.removeEventListener("play", onPlay);
            video.removeEventListener("pause", onPause);
            video.removeEventListener("ended", onEnded);
        };
    }

    // -------------------------------------------------------------------
    // 5) Custom widget descriptor.
    // -------------------------------------------------------------------
    var widget = {
        name: COMPONENT_NAME,
        title: COMPONENT_TITLE,
        // The toolbox icon name is set later from window.__videoSegmentIconName
        // via 8_survey.js (where the toolbox item is created/refined).
        iconName: iconName,

        widgetIsLoaded: function () { return true; },

        isFit: function (question) {
            return question.getType() === COMPONENT_NAME;
        },

        // No-op: class registration happens at module load above.
        activatedByChanged: function () { /* intentionally empty */ },

        htmlTemplate:
            '<div class="sjs-video-segment">' +
                '<video class="sjs-video-segment__player" preload="metadata" controls playsinline></video>' +
                '<div class="sjs-video-segment__error" role="alert"></div>' +
            '</div>',

        afterRender: function (question, el) {
            var video   = el.querySelector(".sjs-video-segment__player");
            var errorEl = el.querySelector(".sjs-video-segment__error");

            // Always apply layout first, even on error path, so the error
            // banner has the configured width/height.
            applyLayout(video, question);

            var configError = getConfigError(question);
            if (configError) {
                errorEl.textContent = "Video Segment configuration error: " + configError;
                errorEl.classList.add("is-visible");
                video.style.display = "none";
                if (typeof question.addError === "function" && typeof Survey.SurveyError === "function") {
                    try {
                        question.addError(new Survey.SurveyError(configError, question));
                    } catch (e) { /* older builds may signal differently */ }
                }
                return;
            }

            var start = parseSeconds(question.startTimestamp);
            var end   = parseSeconds(question.endTimestamp);

            video.src = resolveVideoUrl(question.videoUrl);

            video.__videoSegmentDetach = attachPlaybackEnforcement(video, question, start, end);

            // Read-only state: hide native controls and prevent interaction.
            if (question.isReadOnly) {
                video.controls = false;
            }
            question.readOnlyChangedCallback = function () {
                video.controls = !question.isReadOnly;
            };

            // Make the layout properties live: editing them in the Creator
            // updates the preview without requiring a page refresh.
            ["videoFit", "videoHeight", "videoWidth"].forEach(function (propName) {
                if (typeof question.registerFunctionOnPropertyValueChanged === "function") {
                    question.registerFunctionOnPropertyValueChanged(propName, function () {
                        applyLayout(video, question);
                    }, "videoSegmentLayout-" + propName);
                }
            });
            // videoUrl edits in the Creator should update the player's
            // <source> live, without requiring a page reload.
            if (typeof question.registerFunctionOnPropertyValueChanged === "function") {
                question.registerFunctionOnPropertyValueChanged("videoUrl", function () {
                    var newUrl = resolveVideoUrl(question.videoUrl);
                    if (newUrl !== video.src) video.src = newUrl;
                }, "videoSegmentUrl");
            }
        },

        willUnmount: function (question, el) {
            if (!el || typeof el.querySelector !== "function") return;
            var video = el.querySelector(".sjs-video-segment__player");
            if (!video) return;
            try {
                if (typeof video.__videoSegmentDetach === "function") {
                    video.__videoSegmentDetach();
                    video.__videoSegmentDetach = null;
                }
                video.pause();
                video.removeAttribute("src");
                video.load();
            } catch (e) { /* best-effort cleanup */ }
            // Detach property-change callbacks so we don't leak them when
            // the question is destroyed.
            if (question && typeof question.unRegisterFunctionOnPropertyValueChanged === "function") {
                ["videoFit", "videoHeight", "videoWidth", "videoUrl"].forEach(function (propName) {
                    try {
                        question.unRegisterFunctionOnPropertyValueChanged(
                            propName,
                            propName === "videoUrl" ? "videoSegmentUrl" : "videoSegmentLayout-" + propName
                        );
                    } catch (e) {}
                });
            }
        }
    };

    if (Survey.CustomWidgetCollection &&
        Survey.CustomWidgetCollection.Instance &&
        !Survey.CustomWidgetCollection.Instance.getCustomWidgetByName(COMPONENT_NAME)) {
        Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");
    }
})();
