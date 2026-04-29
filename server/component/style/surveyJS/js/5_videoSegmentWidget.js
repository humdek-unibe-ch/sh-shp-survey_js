/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Video custom SurveyJS question widget (v1.4.10).
 *
 * Built against SurveyJS v1.9.124 (do NOT upgrade).
 *
 * The question type is **`video`**, all lowercase (SurveyJS' Serializer
 * lowercases every registered class name internally). It is a brand
 * new addition in v1.4.8; no backward compatibility with any earlier
 * working name is needed and none is provided.
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
 * how a `video` question is drawn. The `<video>` element with native
 * controls is the only UI; configuration is in the property panel.
 *
 * Property surface
 * ----------------
 *   videoUrl        (string, required)            -> "Video URL"
 *   startTimestamp  (number, optional, no default) -> "Start timestamp (seconds, optional)"
 *   endTimestamp    (number, optional, no default) -> "End timestamp (seconds, optional)"
 *   videoFit        ("none"|"contain"|"cover"|"fill", default "contain") -> "Video fit"
 *   videoHeight     (CSS string, default "")      -> "Video height (CSS-accepted values)"
 *   videoWidth      (CSS string, default "")      -> "Video width (CSS-accepted values)"
 *
 * Property-panel UX note: BOTH timestamps deliberately have NO default,
 * not `0`. Setting `default: 0` causes the Creator's number editor to
 * pre-fill `0` into the field, which then flips the cross-field
 * validator into "0 >= 0" and shows a spurious "startTimestamp must be
 * strictly less than endTimestamp" error before the user has typed
 * anything. Leaving the default unset means the editor renders a blank
 * field for both, and the user simply leaves them blank to indicate
 * "no segment, play the whole video".
 *
 * Playback semantics
 * ------------------
 *   - When `startTimestamp` AND `endTimestamp` are set (and `end > 0`),
 *     the segment is enforced exactly: seeks before `start` snap
 *     forward, seeks past `end` snap back, the player auto-pauses at
 *     `end`, and pressing play after the end restarts at `start`.
 *   - When `endTimestamp` is omitted (or 0 — that's nonsensical for an
 *     end timestamp so we treat it as "not set"), the user can watch
 *     the entire video. We still respect a non-zero `startTimestamp`
 *     if provided, so an "intro skip" use case (start at 12s, play to
 *     natural end) works.
 *   - When both timestamps are omitted (the common case), the question
 *     behaves like a plain video player with progress tracking.
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
 * `4_surveyJS.js` from the `data-survey-js-fields` attribute (runtime)
 * and by `8_survey.js` from the Creator container's `data-base-path`
 * attribute (Creator preview). Both are populated by PHP from the
 * `BASE_PATH` constant.
 *
 * Question value
 * --------------
 * The widget continuously persists a snapshot of the user's playback
 * state to `question.value` on every play / pause / seek / clamp /
 * ended event. See the doc-comment on `attachPlaybackEnforcement` for
 * the exact schema; in short:
 *
 *   { watched, currentTime, startTimestamp, endTimestamp, duration,
 *     watchedSeconds, percentWatched, startedAt, lastUpdatedAt,
 *     lastEvent, completedAt }
 *
 * This is purely auto-generated; the property panel intentionally hides
 * the standard `defaultValue` / `correctAnswer` editors.
 */
(function registerVideoQuestionWidget() {
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
    var COMPONENT_NAME      = "video";          // canonical lowercased type
    var COMPONENT_TITLE     = "Video";           // human-facing display label

    /**
     * "Supervised viewing" — the question itself was explicitly
     * marked `"readOnly": true` in the survey JSON.
     *
     * The widget treats `readOnly` and `isRequired` as TWO
     * independent levers, each with a single, predictable effect:
     *
     *   - `readOnly`   -> hide native controls + force auto-start
     *                       (the participant can see the video but
     *                       cannot scrub / pause / skip — a
     *                       "watch only" UX).
     *   - `isRequired` -> watch-gate: block Next / Complete until
     *                       the video reaches the end of the
     *                       configured segment (or the file's
     *                       natural end).
     *   - Both          -> both effects: no controls AND must-watch-
     *                       to-advance.
     *
     * EXPLICIT vs COMPUTED read-only — why we read `question.readOnly`
     * --------------------------------------------------------------
     * SurveyJS exposes two different read-only accessors on every
     * question:
     *
     *   - `question.readOnly`   — the explicit per-question flag,
     *                             reflecting whatever the JSON
     *                             property `"readOnly": true|false`
     *                             stored. Falsy unless the designer
     *                             opted in for THIS specific
     *                             question.
     *   - `question.isReadOnly` — a COMPUTED getter that ORs the
     *                             explicit flag with parent-panel
     *                             read-only AND survey-mode
     *                             inheritance. When the survey is
     *                             rendered with `mode: "display"`
     *                             (review of past answers), this
     *                             becomes `true` for every question
     *                             on the survey, even ones the
     *                             designer never marked read-only.
     *
     * We key the watch-only UX off `readOnly` (explicit), NOT
     * `isReadOnly` (computed). Why: a designer who sets
     * `mode: "display"` for review wants exactly that — review.
     * They want the participant to see all their past answers,
     * including being able to replay any video at their own pace
     * with the native controls. Hiding the controls and auto-
     * starting playback on review pages would surprise them
     * silently; nothing in `mode: "display"` says "force-watch
     * everything". The "force-watch" UX must be opt-in
     * per-question, via an explicit `"readOnly": true` in the JSON.
     */
    function isSupervisedViewing(question) {
        return !!(question && question.readOnly);
    }

    // -------------------------------------------------------------------
    // 1) Class registration
    //
    // Properties are intentionally minimal:
    //   - videoUrl       : required (no useful default)
    //   - startTimestamp : optional, NO default (blank field by default)
    //   - endTimestamp   : optional, NO default (blank field by default)
    //   - videoFit / videoHeight / videoWidth : optional layout overrides
    //
    // Both timestamps deliberately omit `default: 0` — see the file
    // header for the rationale.
    //
    // When `endTimestamp` is unset (or 0) we treat the segment as the
    // full video and resolve `end` lazily against `video.duration` on
    // `loadedmetadata`.
    // -------------------------------------------------------------------
    if (!Survey.Serializer.findClass(COMPONENT_NAME)) {
        Survey.Serializer.addClass(
            COMPONENT_NAME,
            [
                {
                    name: "videoUrl:string",
                    isRequired: true,
                    category: "general",
                    displayName: "Video URL",
                    description: "Absolute URL (https://…), data URI, or SelfHelp-relative path starting with `/` (e.g. `/assets/clip.mp4`)."
                },
                {
                    // No `default` value -> property is omitted from the
                    // saved JSON when left blank. The widget then plays
                    // from the start of the file.
                    name: "startTimestamp:number",
                    minValue: 0,
                    category: "general",
                    displayName: "Start timestamp (seconds, optional)",
                    description: "Where playback begins. Leave blank to start at 0."
                },
                {
                    // No `default` value -> property is omitted from the
                    // saved JSON when left blank. The widget then plays
                    // the full video (end = video.duration after
                    // loadedmetadata).
                    name: "endTimestamp:number",
                    minValue: 0,
                    category: "general",
                    displayName: "End timestamp (seconds, optional)",
                    description: "Where playback stops. Leave blank to play to the natural end of the file."
                },
                /*
                 * Auto-start playback as soon as the question becomes
                 * visible (page load / page navigation). Useful for
                 * single-video-per-page setups where the participant
                 * lands on the page and the video should just start
                 * playing.
                 *
                 * Browser autoplay policies still apply — if there has
                 * been no recent user gesture (typical on the very first
                 * page of a directly-opened survey), the browser will
                 * silently block the play() call and the user clicks
                 * play manually. After any user gesture (e.g. clicking
                 * the survey's Next button to advance to a video page)
                 * autoplay generally works.
                 *
                 * Auto-start also kicks in IMPLICITLY in **supervised
                 * viewing** mode — that is, when the question's JSON
                 * has `"readOnly": true`. (Survey-level
                 * `mode: "display"` makes every question's effective
                 * `isReadOnly` true via inheritance, but does NOT
                 * trigger supervised viewing — that's a per-question
                 * opt-in, see `isSupervisedViewing`.) Read-only hides
                 * the native player controls, so without auto-start
                 * the participant would have no way to start
                 * playback at all. Combined with `isRequired` (the
                 * independent watch-gate) this delivers the classic
                 * "force the participant to watch the whole video /
                 * configured segment before they can advance" UX —
                 * the video starts on its own, plays through to the
                 * configured end (or the file's natural end if no
                 * `endTimestamp` is set), and the survey's Next
                 * button stays blocked until completion. On its own
                 * (read-only without required) it just delivers a
                 * passive watch-only UX where navigation is still
                 * free.
                 *
                 * Auto-play is suppressed in the Creator's Designer
                 * tab (`survey.isDesignMode === true`) so every
                 * property edit doesn't re-trigger playback in the
                 * preview pane.
                 *
                 * No implicit muting is applied; the video plays
                 * with its natural sound. If you need autoplay-with-
                 * sound on a directly-opened first page, host the
                 * video on a page that's reached via a Next click.
                 * This caveat applies to both designer-opted
                 * `autoStart` and read-only-implicit auto-play.
                 */
                {
                    name: "autoStart:boolean",
                    default: false,
                    category: "general",
                    displayName: "Auto-start playback when the question is shown",
                    description: "Begin playback automatically when the participant arrives on this question. Also forced ON when the question itself is marked readOnly: true (controls are hidden then, so it's the only way to play). Survey-level mode: \"display\" review pages do NOT force auto-start — that's a per-question opt-in. Browsers may block autoplay-with-sound on the very first page of a freshly-opened survey; place such videos on page 2+ (reached via a Next click) to be safe."
                },
                /*
                 * "Video fit" / height / width — wired to the <video>
                 * element via inline style + object-fit. Default is
                 * "contain" because that's what most users expect for a
                 * video player (fit inside without distortion).
                 */
                {
                    name: "videoFit",
                    default: "contain",
                    choices: ["none", "contain", "cover", "fill"],
                    category: "layout",
                    displayName: "Video fit",
                    description: "How the bitmap fills the player box. `contain` keeps the aspect ratio (default; black bars if the video and box don't match). `cover` fills the box and crops what doesn't fit. `fill` stretches without keeping aspect. `none` shows at native size."
                },
                {
                    name: "videoHeight:string",
                    default: "",
                    category: "layout",
                    displayName: "Video height (CSS-accepted values)",
                    description: "Height of the player box (e.g. `300px`, `50vh`, `30rem`). Leave blank for the default 240 px minimum."
                },
                {
                    name: "videoWidth:string",
                    default: "",
                    category: "layout",
                    displayName: "Video width (CSS-accepted values)",
                    description: "Width of the player box (e.g. `100%`, `640px`, `40rem`). Leave blank for full row width."
                },
                /*
                 * Translatable alert shown to the participant when the
                 * question is `isRequired` and they try to advance before
                 * watching to the end of the configured segment (or to
                 * the file's natural end if no `endTimestamp` is set).
                 *
                 * The property is registered as `isLocalizable: true`, so
                 * SurveyJS:
                 *   1. Creates a `LocalizableString` on the question
                 *      automatically (named `locRequiredWatchMessage`)
                 *      and wires the `requiredWatchMessage` getter/setter
                 *      to delegate to it for `survey.locale`.
                 *   2. Auto-includes the property in the Creator's
                 *      Translation tab — designers can fill in per-locale
                 *      strings (German, French, …) right next to the
                 *      question's `title`/`description`. JSON is then
                 *      serialised as `{ default: "…", de: "…", fr: "…" }`
                 *      instead of a flat string.
                 *
                 * Resolution order at runtime (see `getRequiredWatchMessage`):
                 *   1. SurveyJS-resolved locale value (LocalizableString
                 *      returns the active-locale entry, or the default,
                 *      or "" if neither is set).
                 *   2. Built-in `DEFAULT_REQUIRED_WATCH_MESSAGES[locale]`
                 *      backstop (en/de/fr/it bundled).
                 *   3. English default.
                 *
                 * `:text` selects a textarea editor in the property panel
                 * (instead of a single-line input), which is appropriate
                 * for short multi-sentence alerts.
                 */
                {
                    name: "requiredWatchMessage:text",
                    isLocalizable: true,
                    category: "general",
                    displayName: "Required-watch alert (optional, falls back to localized default)",
                    description: "Shown to the participant when the question is required and they try to advance before watching to the end. Open the Translation tab to fill in per-locale wording. Leave blank to inherit the built-in en/de/fr/it default."
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
    // SurveyJS' Serializer lowercases the registered class name, so the
    // canonical type returned by `question.getType()` is `"video"`. By
    // default the Creator's question-type dropdown falls back to that
    // lowercased type as the display label. We override it via:
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
    // Seed the canonical "video" type in every locale namespace SurveyJS /
    // survey-creator-knockout might consult.
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
    // We expose the resolved icon name via window.__videoQuestionIconName
    // so 8_survey.js can use whichever icon actually exists in this build
    // of survey-creator-knockout. We try, in order:
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
            registry.registerIconFromSvg("video-question", VIDEO_ICON_SVG);
            iconName = "icon-video-question";
        }
    } catch (e) {
        // keep fallback
    }
    // Exposed for 8_survey.js (Creator init) so the toolbox item can use
    // whichever icon actually exists in this build of
    // survey-creator-knockout.
    window.__videoQuestionIconName = iconName;

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

    /**
     * Validate the configuration of a video question.
     *
     * URL is the only mandatory field. Both timestamps are optional —
     * an unset (null/undefined/empty/0) endTimestamp means "play the
     * full file"; an unset (null/undefined/empty/0) startTimestamp
     * means "start at 0". When BOTH timestamps are meaningful (set
     * AND strictly > 0) we additionally require `start < end`.
     *
     * `0` is treated as "not configured" for both timestamps. This is
     * deliberate: the property panel's number editor in some builds
     * renders blank fields as `0`, and we don't want to surface a
     * spurious "start must be < end" error in that case. Even when
     * the user explicitly types `0`, the resulting playback
     * (`startTimestamp = 0`, full video) is identical to
     * "left blank", so collapsing the two states is harmless.
     *
     * Note: `parseSeconds` returns `null` for unset, empty-string and
     * non-finite values; that's our "not provided" signal.
     */
    function getConfigError(question) {
        var url = question.videoUrl;
        if (!url || (typeof url === "string" && !url.trim())) {
            return "Video URL is required";
        }
        var start = parseSeconds(question.startTimestamp);
        var end   = parseSeconds(question.endTimestamp);

        if (start !== null && start < 0) {
            return "startTimestamp must be greater than or equal to 0";
        }
        if (end !== null && end < 0) {
            return "endTimestamp must be greater than or equal to 0";
        }
        // Cross-field rule only applies when BOTH timestamps are
        // meaningful upper bounds — i.e. concrete numbers strictly
        // greater than zero.
        var isMeaningful = function (n) { return n !== null && n > 0; };
        if (isMeaningful(start) && isMeaningful(end) && start >= end) {
            return "startTimestamp must be strictly less than endTimestamp";
        }
        return null;
    }

    /**
     * Built-in translations for the required-watch alert.
     *
     * Acts as a backstop when the survey designer has not provided a
     * per-locale string via the Creator's Translation tab — in that
     * case `question.requiredWatchMessage` resolves to the empty
     * string and `getRequiredWatchMessage` falls through to this table
     * keyed by `survey.locale` (which the CMS pushes via
     * `4_surveyJS.js`).
     *
     * Keys are SurveyJS locale codes (`en`, `de`, `fr`, …). The
     * `default` entry is used when `survey.locale` is empty (the
     * SurveyJS default state) or when no entry exists for the active
     * locale. To add a locale, just append a new key — no other code
     * changes required.
     */
    var DEFAULT_REQUIRED_WATCH_MESSAGES = {
        "default": "Please watch the video to the end before continuing.",
        "en":      "Please watch the video to the end before continuing.",
        "de":      "Bitte sehen Sie sich das Video bis zum Ende an, bevor Sie fortfahren.",
        "fr":      "Veuillez regarder la vidéo jusqu'à la fin avant de continuer.",
        "it":      "Si prega di guardare il video fino alla fine prima di continuare."
    };

    /**
     * Resolve the required-watch alert message for a question.
     *
     * The property is `isLocalizable: true`, so reading
     * `question.requiredWatchMessage` already does locale resolution
     * via SurveyJS' LocalizableString machinery: it returns the entry
     * for `survey.locale`, or the property's `default` locale entry,
     * or `""` when neither has been set in the Creator's Translation
     * tab.
     *
     * Resolution order in priority:
     *   1. SurveyJS-resolved per-locale string when the designer
     *      filled in something (Translation tab or property panel).
     *   2. Built-in `DEFAULT_REQUIRED_WATCH_MESSAGES[survey.locale]`
     *      backstop when nothing has been provided.
     *   3. English default as the final fallback.
     */
    function getRequiredWatchMessage(question) {
        var custom = question && question.requiredWatchMessage;
        if (typeof custom === "string" && custom.trim()) {
            return custom;
        }
        var locale = (question && question.survey && question.survey.locale) || "";
        if (locale && DEFAULT_REQUIRED_WATCH_MESSAGES[locale]) {
            return DEFAULT_REQUIRED_WATCH_MESSAGES[locale];
        }
        return DEFAULT_REQUIRED_WATCH_MESSAGES["default"];
    }

    /**
     * Lazy-attach a survey-level validator that requires the user to
     * watch the video to the end (or to the configured segment end)
     * before a `video` question with `isRequired: true` can satisfy
     * `survey.tryComplete()` / `survey.nextPage()`.
     *
     * Why a survey-level hook and not a per-question validator?
     * SurveyJS' built-in `isRequired` handling considers any
     * non-`isEmpty()` value as "answered". Our widget continuously
     * persists playback state to `question.value` from the very first
     * `loadedmetadata` snapshot, so by the time the user sees the
     * player there is already a value object in place. That makes the
     * stock `isRequired` check vacuously true and the user could
     * `next`/`complete` without ever pressing play. We instead enforce
     * a stricter `watched === true` check at the survey level.
     *
     * Three layered hooks
     * -------------------
     *   1. `onValidateQuestion` — fires per-question during validation.
     *      Catches the regular (NOT read-only) case. SurveyJS skips
     *      this hook for read-only questions, so it's not enough on
     *      its own.
     *   2. `onCurrentPageChanging` — fires whenever the participant
     *      tries to advance via the survey's Next button (or any
     *      programmatic page change). Iterates ALL video questions on
     *      the current page, including read-only ones, and blocks the
     *      transition if any required one hasn't been watched. THIS is
     *      what enforces the "read-only + required = supervised
     *      viewing" UX — without it, SurveyJS' built-in read-only-skip
     *      lets the participant click Next freely.
     *   3. `onCompleting` — same logic as #2, but for the final
     *      page's complete-button. Blocks survey submission when a
     *      required video on the last page hasn't been watched.
     *
     * Backward navigation is allowed regardless of watch state — we
     * only block forward / complete actions. Pre-existing video-
     * question errors (tagged `__fromVideoQuestion`) are stripped at
     * the start of every check so the inline alert clears the moment
     * the participant finishes watching and tries again.
     *
     * The error message is resolved through `getRequiredWatchMessage`
     * so it honours both per-question custom strings (with the
     * Translation tab's per-locale entries) and the active survey
     * locale's built-in fallback.
     *
     * Idempotent: tagged on the survey instance so we attach once even
     * if multiple video questions share a survey.
     */
    function attachRequiredWatchValidator(question) {
        var survey = question && question.survey;
        if (!survey) return;
        if (survey.__videoQuestionRequiredHookAttached) return;
        survey.__videoQuestionRequiredHookAttached = true;

        function isRequiredVideoQuestion(q) {
            return q && typeof q.getType === "function"
                && q.getType() === COMPONENT_NAME
                && q.isRequired === true;
        }

        function getPageVideoQuestions(page) {
            if (!page) return [];
            // SurveyJS exposes `getQuestions(visibleOnly)` on PageModel
            // in modern builds; fall back to `.questions` on older
            // ones. Either way we only consider visible questions —
            // hidden video questions on the page shouldn't block
            // navigation.
            var qs = (typeof page.getQuestions === "function")
                ? page.getQuestions(true)
                : (Array.isArray(page.questions) ? page.questions : []);
            return qs.filter(isRequiredVideoQuestion);
        }

        function clearVideoErrors(q) {
            if (!q || !Array.isArray(q.errors)) return;
            for (var i = q.errors.length - 1; i >= 0; i--) {
                if (q.errors[i] && q.errors[i].__fromVideoQuestion) {
                    q.errors.splice(i, 1);
                }
            }
        }

        function attachVideoError(q) {
            try {
                if (typeof q.addError === "function" &&
                    typeof Survey.SurveyError === "function") {
                    var err = new Survey.SurveyError(getRequiredWatchMessage(q), q);
                    err.__fromVideoQuestion = true;
                    q.addError(err);
                }
            } catch (e) { /* older builds may signal differently */ }
        }

        // Returns the array of unwatched required video questions on
        // the current page; refreshes their inline error banner as a
        // side-effect (clears stale ones, attaches new ones for
        // currently-failing questions).
        function checkPage(page) {
            var unwatched = [];
            var videoQs = getPageVideoQuestions(page);
            for (var i = 0; i < videoQs.length; i++) {
                var q = videoQs[i];
                clearVideoErrors(q);
                var v = q.value;
                if (!v || v.watched !== true) {
                    attachVideoError(q);
                    unwatched.push(q);
                }
            }
            return unwatched;
        }

        // Hook 1: onValidateQuestion (per-question, fires for non-
        // read-only questions). Kept for the standard required-watch
        // case so the inline error appears immediately on Next.
        if (survey.onValidateQuestion &&
            typeof survey.onValidateQuestion.add === "function") {
            survey.onValidateQuestion.add(function (_, options) {
                var q = options && options.question;
                if (!isRequiredVideoQuestion(q)) return;
                var v = q.value;
                // `watched` only becomes true once the player reached
                // `end - 0.05` seconds (segment end if configured, file
                // duration otherwise). Anything else — undefined value,
                // never-played, paused mid-segment, abandoned at 90 %
                // — counts as "not yet completed".
                if (!v || v.watched !== true) {
                    options.error = getRequiredWatchMessage(q);
                }
            });
        }

        // Whether the page-level hooks should treat this navigation
        // attempt as a real survey-taking action that can be blocked.
        // We DO enforce the gate in read-only / display mode: a
        // participant who has actually watched the video has
        // `value.watched === true` saved, so the gate passes
        // immediately on review. The gate only blocks if the saved
        // value is missing the watched flag — typically because the
        // question is brand-new on this page and hasn't been played
        // yet — which is exactly when the designer wants the gate to
        // block. Designer-side preview from the Creator's Designer
        // tab is excluded (`isDesignMode`) so the designer can flip
        // properties without the gate fighting them.
        function shouldEnforceWatchGate(sender) {
            if (!sender) return false;
            if (sender.isDesignMode === true) return false;
            return true;
        }

        // Hook 2: onCurrentPageChanging (page-level, fires regardless
        // of read-only). Catches the supervised-viewing case
        // (`isReadOnly && isRequired`) that Hook 1 cannot, since
        // SurveyJS' Question.hasErrors() returns false early for
        // read-only questions.
        if (survey.onCurrentPageChanging &&
            typeof survey.onCurrentPageChanging.add === "function") {
            survey.onCurrentPageChanging.add(function (sender, options) {
                if (!shouldEnforceWatchGate(sender)) return;
                // Only block forward navigation. Letting participants
                // go back even mid-watch is harmless — they haven't
                // submitted anything they shouldn't have.
                if (options && options.isNextPage === false) return;
                var unwatched = checkPage(sender.currentPage);
                if (unwatched.length === 0) return;
                // Different SurveyJS versions use different option
                // names to block the transition; set both for safety.
                options.allowChanging = false;
                options.allow = false;
            });
        }

        // Hook 3: onCompleting (final-page submit). Same logic as
        // Hook 2 but for the survey's complete action.
        if (survey.onCompleting &&
            typeof survey.onCompleting.add === "function") {
            survey.onCompleting.add(function (sender, options) {
                if (!shouldEnforceWatchGate(sender)) return;
                var unwatched = checkPage(sender.currentPage);
                if (unwatched.length === 0) return;
                options.allowComplete = false;
                options.allow = false;
            });
        }
    }

    /**
     * Apply the videoFit / videoHeight / videoWidth properties to the DOM.
     * Called both from afterRender and from property-change callbacks so
     * editing the layout in the Creator updates the preview live.
     *
     * Layout architecture
     * -----------------------------
     * `videoHeight` / `videoWidth` are applied to the **stage wrapper**
     * (`<div class="sjs-video__stage">`), NOT directly to the `<video>`
     * element. The video element itself is always sized to 100 % of the
     * stage via CSS. This separation matters in two situations:
     *
     *   1. **Native control-bar visibility**. Browsers render the native
     *      controls bar at the bottom of the `<video>` element box, but
     *      most builds align it with the bitmap's painted region rather
     *      than the full element width. With sizing applied directly to
     *      the `<video>` element AND a portrait bitmap in a landscape
     *      container (e.g. a phone-shot clip in a 800×300 box rendered
     *      with `object-fit: contain`), the controls strip is only as
     *      wide as the bitmap (~169 px) — easy to miss visually, and on
     *      some Chrome builds clipped entirely. With sizing on the
     *      stage and the `<video>` element filling 100 % of it, the
     *      controls always span the full configured width at the bottom
     *      of the box.
     *
     *   2. **`object-fit` predictability**. With sizing on the stage,
     *      `object-fit` becomes the only layout concern on the
     *      `<video>` element — `contain` / `cover` / `fill` / `none`
     *      behave exactly as the CSS spec describes, with no
     *      interaction between the element's intrinsic-vs-inline
     *      dimensions and the chosen fit.
     */
    function applyLayout(video, stage, question) {
        var fit = (question.videoFit || "contain").toString();
        // Whitelist allowed values to keep CSS sane.
        var allowed = { none: 1, contain: 1, cover: 1, fill: 1 };
        video.style.objectFit = allowed[fit] ? fit : "contain";

        // Stage dimensions (empty string -> remove inline override so
        // the CSS default kicks in: width 100 %, min-height 240 px).
        if (!stage) return;
        if (question.videoHeight) {
            stage.style.height = String(question.videoHeight);
        } else {
            stage.style.removeProperty("height");
        }
        if (question.videoWidth) {
            stage.style.width = String(question.videoWidth);
        } else {
            stage.style.removeProperty("width");
        }

        // Single-dimension auto-fit. See `applyAutoFit` for the full
        // rationale and the cleanup branch.
        applyAutoFit(video, stage, question);
    }

    /**
     * "Auto-fit" the stage to the bitmap's intrinsic aspect ratio when
     * the designer has set EXACTLY ONE of `videoHeight` / `videoWidth`.
     *
     * Why this exists
     * ---------------
     * The widget always uses `object-fit: contain` (default) for the
     * `<video>` element, so when the stage's box-aspect doesn't match
     * the bitmap's aspect the participant gets letterbox bars. That's
     * fine if the designer set BOTH dimensions explicitly — they
     * wanted the bars. But a designer who only sets `videoHeight:
     * "300px"` for a portrait phone clip almost certainly does NOT
     * want a stage that's full row-width × 300 px with two huge black
     * pillars on either side. They want "300 px tall, width auto".
     *
     * Behaviour matrix
     * ----------------
     *   neither set   -> defaults (width 100 %, min-height 240 px),
     *                    `object-fit: contain` does its thing.
     *   ONLY height   -> aspect-ratio honoured: width auto-computed
     *                    to bitmapW × (height / bitmapH).
     *   ONLY width    -> aspect-ratio honoured: height auto-computed
     *                    to bitmapH × (width / bitmapW).
     *   BOTH set      -> respect both literally; designer asked for
     *                    that exact box even if it produces bars.
     *
     * Implementation
     * --------------
     * Uses CSS `aspect-ratio` on the stage. The browser resolves the
     * implicit dimension from the explicit one + aspect-ratio. We
     * also need to:
     *
     *   - override the CSS default `width: 100%` with `width: auto`
     *     when only height is set (otherwise width stays 100 % and
     *     aspect-ratio is ignored), and symmetrically `height: auto`
     *     when only width is set;
     *   - drop the CSS default `min-height: 240px` so a bitmap that
     *     resolves to a smaller stage isn't padded out and breaks the
     *     aspect ratio.
     *
     * Idempotent: when called with both/neither dimensions set we
     * cleanly remove the inline `aspect-ratio`, `min-height` and
     * stale `auto` overrides so the CSS defaults take over.
     *
     * Called from:
     *   - applyLayout, on every layout property change (height,
     *     width, fit). Bitmap dimensions may not be ready yet; that's
     *     fine, we early-return and the loadedmetadata handler will
     *     re-run us when they are.
     *   - attachPlaybackEnforcement → onLoadedMetadata, the moment
     *     `video.videoWidth` / `video.videoHeight` become non-zero.
     */
    function applyAutoFit(video, stage, question) {
        if (!stage) return;
        var hasH = !!question.videoHeight;
        var hasW = !!question.videoWidth;

        // Reset path: both or neither set. Clear any inline overrides
        // we may have applied previously so the CSS defaults take
        // over (width: 100%, min-height: 240px, no aspect-ratio).
        if (hasH === hasW) {
            stage.style.removeProperty("aspect-ratio");
            stage.style.removeProperty("min-height");
            return;
        }

        var bitmapW = video && video.videoWidth;
        var bitmapH = video && video.videoHeight;
        if (!bitmapW || !bitmapH) {
            // Metadata not loaded yet. The onLoadedmetadata handler
            // will call us again with the intrinsic dimensions
            // available.
            return;
        }

        stage.style.aspectRatio = bitmapW + " / " + bitmapH;
        // Drop min-height so a small auto-computed height doesn't
        // get padded out, breaking the requested aspect.
        stage.style.minHeight = "0";

        if (hasH && !hasW) {
            // Override `width: 100%` from the CSS default so
            // aspect-ratio actually computes the width.
            stage.style.width = "auto";
        } else if (hasW && !hasH) {
            // Symmetric for width-only.
            stage.style.height = "auto";
        }
    }

    /**
     * Wire up an HTML5 <video> element so it strictly enforces the
     * [start, end] playback window AND records the current playback state
     * in the question's value. Returns a cleanup function.
     *
     * Bound resolution
     * ----------------
     * The question's `startTimestamp` defaults to 0 (start of file) when
     * unset. The question's `endTimestamp` is OPTIONAL: when unset (the
     * common "play the whole video" case) we treat `end` as +Infinity
     * until `loadedmetadata` fires, then promote it to `video.duration`.
     * This keeps the segment-clamping logic (timeupdate/seek/play/pause
     * handlers) untouched — they all just compare against `end` and
     * `Infinity` simply means "no upper bound".
     *
     * Question value schema (always assigned, even on partial playback):
     *
     *   {
     *     watched:        boolean,       // true once the user reached `end`
     *     currentTime:    number,        // last observed currentTime, clamped to [start, end]
     *     startTimestamp: number,        // segment start (echoed for audits)
     *     endTimestamp:  number|null,    // segment end (null when undetermined / full file)
     *     duration:       number|null,   // (end - start), null when end is undetermined
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
    function attachPlaybackEnforcement(video, question) {
        // ---- segment bounds ---------------------------------------------
        var startRaw = parseSeconds(question.startTimestamp);
        var start    = (startRaw === null || startRaw < 0) ? 0 : startRaw;

        var endRaw         = parseSeconds(question.endTimestamp);
        // `endTimestamp === 0` is treated as "not set" (a 0-second
        // segment is nonsensical and would only happen because the
        // property-panel number editor pre-filled 0 in a blank field).
        // We only consider end "explicit" when it is a real upper bound
        // strictly greater than `start`.
        var hasExplicitEnd = endRaw !== null && endRaw > 0 && endRaw > start;
        // `end` will be promoted to `video.duration` on `loadedmetadata`
        // when the survey designer didn't pin it explicitly.
        var end      = hasExplicitEnd ? endRaw : Infinity;
        var duration = isFinite(end) ? (end - start) : Infinity;

        // ---- mutable state ----------------------------------------------
        var enforcing       = false;
        var watchedSeconds  = 0;
        var lastTickAt      = null;       // wall-clock of the previous timeupdate
        var startedAt       = null;       // ISO of the very first "play"
        var completedAt     = null;       // ISO of the moment watched became true

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
                // We can only declare the video "watched" once we know how
                // long it actually is.
                var watched = isFinite(end) ? (t >= end - 0.05) : false;
                if (watched && !completedAt) completedAt = safeISO();

                var clampedTime = Math.max(start, isFinite(end) ? Math.min(end, t) : t);

                question.value = {
                    watched:        watched,
                    currentTime:    clampedTime,
                    startTimestamp: start,
                    endTimestamp:   isFinite(end) ? end : null,
                    duration:       isFinite(duration) ? duration : null,
                    watchedSeconds: Math.round(watchedSeconds * 1000) / 1000,
                    percentWatched: (isFinite(duration) && duration > 0)
                        ? Math.min(1, watchedSeconds / duration)
                        : 0,
                    startedAt:      startedAt,
                    lastUpdatedAt:  safeISO(),
                    lastEvent:      eventType,
                    completedAt:    completedAt
                };
            } catch (e) { /* ignore */ }
        }

        var onLoadedMetadata = function () {
            // Auto-fit the stage to the bitmap's aspect ratio as soon
            // as we know the intrinsic dimensions. The first
            // applyLayout call (during afterRender) ran before the
            // bitmap was loaded, so any single-dimension request
            // (videoHeight OR videoWidth alone) is still letterboxed.
            // Now that `video.videoWidth` / `video.videoHeight` are
            // populated, applyAutoFit can resolve the missing
            // dimension via CSS aspect-ratio. Looking up the stage
            // through the DOM avoids threading another argument
            // through the playback enforcement contract.
            var stage = video.parentElement;
            if (stage && stage.classList && stage.classList.contains("sjs-video__stage")) {
                applyAutoFit(video, stage, question);
            }

            // Promote an unset endTimestamp to the real video duration now
            // that we know it. This keeps clamping logic happy and lets
            // the saved value record a meaningful `endTimestamp`.
            if (!hasExplicitEnd && isFinite(video.duration) && video.duration > start) {
                end      = video.duration;
                duration = end - start;
            }
            // Cap an explicit endTimestamp at the actual file length.
            // Without this, a misconfigured `endTimestamp` greater than
            // the video's real duration would make `watched` (which
            // compares `currentTime >= end - 0.05`) impossible to
            // satisfy — and since required questions block submission
            // until `watched === true`, the participant would be
            // permanently stuck on the question. Capping at the real
            // duration matches the behaviour documented in
            // `docs/VIDEO_SEGMENT.md` ("if endTimestamp exceeds the
            // file length, the segment effectively ends at the file's
            // natural end").
            if (hasExplicitEnd && isFinite(video.duration) && end > video.duration) {
                end      = video.duration;
                duration = Math.max(0, end - start);
            }
            // Snap to the segment start so the timeline thumb is in the
            // right place from the get-go. Do NOT record this as an event;
            // it's an automatic positioning step.
            enforcing = true;
            video.currentTime = start;
            enforcing = false;

            // Auto-start playback in two situations:
            //
            //   1. The survey designer opted in via `autoStart: true`.
            //   2. The question is in **supervised viewing** mode —
            //      i.e. the JSON has `"readOnly": true` for THIS
            //      specific question. Read-only hides the native
            //      controls (see below), so without auto-start the
            //      participant would have NO way to begin playback.
            //      Combined with `isRequired` (the independent
            //      watch-gate) this delivers the classic "must watch
            //      the whole video / segment before advancing" UX;
            //      on its own (read-only without required) it
            //      delivers a passive watch-only UX where the
            //      participant can still navigate freely.
            //
            // Survey-level `mode: "display"` (review of past answers)
            // is NOT considered supervised viewing — see
            // `isSupervisedViewing` for the rationale. Review pages
            // keep the native controls visible and respect
            // `autoStart` at face value, so the participant can
            // replay any video at their own pace.
            //
            // Suppressed in the Creator's Designer tab
            // (`survey.isDesignMode === true`) so every property edit
            // doesn't re-fire playback in the preview pane (annoying,
            // and overlapping audio if multiple video questions exist).
            //
            // Browsers may reject the play() promise when there has
            // been no recent user gesture (autoplay-with-sound is
            // blocked on the very first page of a freshly-opened
            // tab). We silently swallow the rejection. In read-only
            // mode this means the participant sees a paused first
            // frame with no controls; place such videos on page 2+
            // (reached via a Next click, which counts as a gesture)
            // to avoid this. After any user gesture autoplay
            // generally works.
            var survey = question && question.survey;
            var inDesignMode = !!(survey && survey.isDesignMode);
            var shouldAutoplay = !inDesignMode && (question.autoStart || isSupervisedViewing(question));
            if (shouldAutoplay) {
                try {
                    var p = video.play();
                    if (p && typeof p.then === "function") {
                        p.catch(function () { /* blocked by browser policy — leave paused */ });
                    }
                } catch (e) { /* older browsers without a play() promise */ }
            }
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
                        if (isFinite(duration) && watchedSeconds > duration) {
                            watchedSeconds = duration;
                        }
                    }
                }
                lastTickAt = now;
            } else {
                lastTickAt = null;
            }
            // Hard-stop: pause exactly at `end`. Skipped when end is the
            // full video duration (the browser fires `ended` naturally).
            if (isFinite(end) && video.currentTime >= end) {
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
            // Only clamp upward when we have an explicit end bound; for
            // full-video playback the browser handles "you can't seek past
            // the end" itself.
            if (isFinite(end) && t > end) {
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
            // restarts at `start`. Without an explicit end bound, only
            // bring the play head up to `start` (covers the case when
            // start > 0 and the user rewinds before the segment).
            var atOrPastEnd = isFinite(end) && video.currentTime >= end - 0.05;
            if (atOrPastEnd || video.currentTime < start) {
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
            // we don't double-record over the natural-end event. (When
            // end is unknown / Infinity, that condition is never true, so
            // the pause is recorded normally.)
            if (isFinite(end) && video.currentTime >= end - 0.05) return;
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
        // The toolbox icon name is set later from window.__videoQuestionIconName
        // via 8_survey.js (where the toolbox item is created/refined).
        iconName: iconName,

        widgetIsLoaded: function () { return true; },

        isFit: function (question) {
            return question.getType() === COMPONENT_NAME;
        },

        // No-op: class registration happens at module load above.
        activatedByChanged: function () { /* intentionally empty */ },

        htmlTemplate:
            '<div class="sjs-video">' +
                // Stage wrapper carries the user-facing sizing
                // (videoHeight / videoWidth). The <video> always fills
                // 100 % of this wrapper via CSS, so native controls
                // span the configured width at the bottom of the box
                // regardless of bitmap aspect ratio. See applyLayout()
                // for the full rationale.
                '<div class="sjs-video__stage">' +
                    '<video class="sjs-video__player" preload="metadata" controls playsinline></video>' +
                '</div>' +
                '<div class="sjs-video__error" role="alert"></div>' +
            '</div>',

        afterRender: function (question, el) {
            var stage   = el.querySelector(".sjs-video__stage");
            var video   = el.querySelector(".sjs-video__player");
            var errorEl = el.querySelector(".sjs-video__error");

            // syncWidget — full render path.
            //
            // Encapsulates ALL rendering decisions that depend on
            // properties whose value can flip the widget between
            // "valid playback" and "config error" states:
            //
            //     videoUrl, startTimestamp, endTimestamp
            //
            // It is called once on initial render AND from each of
            // those properties' change listeners (registered below).
            // Without re-running this whole block on a change, a
            // designer who initially types in `endTimestamp` before
            // `videoUrl` would see the "Video URL is required" banner
            // attached on first render and STAY attached even after
            // they fill in the URL — because the original
            // `afterRender` returned early on configError and never
            // wired any listeners that could later clear it.
            //
            // This is also the only safe place to re-attach playback
            // enforcement: changing `startTimestamp` / `endTimestamp`
            // changes the segment bounds the existing handlers were
            // closed over, so we tear them down and re-create.
            //
            // Layout (`videoFit` / `videoHeight` / `videoWidth`) and
            // controls visibility (`isRequired` / `isReadOnly`) do
            // NOT need a full re-sync — they have their own targeted
            // listeners further down.
            function syncWidget() {
                applyLayout(video, stage, question);

                // Clear any config errors we attached on previous
                // renders. Without this, `question.addError(new
                // SurveyError(...))` accumulates errors on every
                // re-render — so a question that briefly went through
                // an invalid state would keep showing stale errors in
                // the Creator preview even after the survey designer
                // fixed the configuration. We tag our own errors with
                // `__fromVideoQuestion` so we don't accidentally drop
                // unrelated errors that other validators (e.g.
                // SurveyJS' required-question validator) attached.
                if (question && Array.isArray(question.errors)) {
                    for (var i = question.errors.length - 1; i >= 0; i--) {
                        if (question.errors[i] && question.errors[i].__fromVideoQuestion) {
                            question.errors.splice(i, 1);
                        }
                    }
                }

                // Reset the in-template banner too, in case the
                // previous render left it visible from a stale config.
                errorEl.textContent = "";
                errorEl.classList.remove("is-visible");
                video.style.display = "";

                // Detach prior playback enforcement (if any) before
                // re-evaluating: a property change may have invalidated
                // the bounds it was closed over, OR moved the question
                // back into the error state.
                if (typeof video.__videoQuestionDetach === "function") {
                    video.__videoQuestionDetach();
                    video.__videoQuestionDetach = null;
                }

                var configError = getConfigError(question);
                if (configError) {
                    errorEl.textContent = "Video question configuration error: " + configError;
                    errorEl.classList.add("is-visible");
                    video.style.display = "none";
                    if (typeof question.addError === "function" && typeof Survey.SurveyError === "function") {
                        try {
                            var err = new Survey.SurveyError(configError, question);
                            // Tag the error so the next render can drop
                            // it without touching errors added by other
                            // code.
                            err.__fromVideoQuestion = true;
                            question.addError(err);
                        } catch (e) { /* older builds may signal differently */ }
                    }
                    return;
                }

                // Valid config: sync the player <source> and re-attach
                // enforcement with the (possibly new) bounds.
                var newUrl = resolveVideoUrl(question.videoUrl);
                if (video.src !== newUrl) video.src = newUrl;
                video.__videoQuestionDetach = attachPlaybackEnforcement(video, question);
            }

            syncWidget();

            // When the question is marked required, block survey
            // navigation/completion until the video has been watched
            // to the configured end (or to the file's natural end if
            // no `endTimestamp` is set). The validator is attached to
            // the survey instance the first time any video question
            // renders, and idempotently no-ops on subsequent calls.
            attachRequiredWatchValidator(question);

            // Native controls are hidden ONLY when the JSON
            // explicitly sets `"readOnly": true` on this specific
            // question. Survey-level `mode: "display"` (review of
            // past answers) does NOT hide controls — see
            // `isSupervisedViewing` for the explicit-vs-computed
            // rationale. The watch-gate is a separate concern,
            // controlled by `isRequired`, and applies independently
            // — see `attachRequiredWatchValidator`.
            //
            // `readOnlyChangedCallback` is the SurveyJS hook for live
            // changes to the EFFECTIVE read-only state. We still
            // wire it because a logic expression flipping
            // `question.readOnly` true/false at runtime should
            // re-hide / re-show the controls; the callback fires for
            // both the explicit and inherited paths, and our check
            // (`!question.readOnly`) self-filters out the inherited
            // case so review-mode toggles never flicker the
            // controls.
            function applySupervisedViewingState() {
                video.controls = !isSupervisedViewing(question);
            }
            applySupervisedViewingState();
            question.readOnlyChangedCallback = applySupervisedViewingState;

            // Make the layout properties live: editing them in the
            // Creator updates the preview without requiring a page
            // refresh. These don't trigger a full syncWidget — only
            // applyLayout — because changing the box dimensions or
            // fit doesn't affect validity or playback bounds.
            ["videoFit", "videoHeight", "videoWidth"].forEach(function (propName) {
                if (typeof question.registerFunctionOnPropertyValueChanged === "function") {
                    question.registerFunctionOnPropertyValueChanged(propName, function () {
                        applyLayout(video, stage, question);
                    }, "videoQuestionLayout-" + propName);
                }
            });

            // videoUrl / startTimestamp / endTimestamp edits in the
            // Creator MUST trigger a full re-sync: each of them can
            // toggle the widget between "valid playback" and "config
            // error" (e.g. typing a URL clears "Video URL is
            // required"; dragging endTimestamp below startTimestamp
            // re-introduces the cross-field banner; clearing them
            // both takes us back to "play whole file"). syncWidget
            // re-runs the entire validity / src / playback-enforcement
            // pipeline.
            ["videoUrl", "startTimestamp", "endTimestamp"].forEach(function (propName) {
                if (typeof question.registerFunctionOnPropertyValueChanged === "function") {
                    question.registerFunctionOnPropertyValueChanged(
                        propName,
                        syncWidget,
                        "videoQuestionSync-" + propName
                    );
                }
            });
        },

        willUnmount: function (question, el) {
            if (!el || typeof el.querySelector !== "function") return;
            var video = el.querySelector(".sjs-video__player");
            if (!video) return;
            try {
                if (typeof video.__videoQuestionDetach === "function") {
                    video.__videoQuestionDetach();
                    video.__videoQuestionDetach = null;
                }
                video.pause();
                video.removeAttribute("src");
                video.load();
            } catch (e) { /* best-effort cleanup */ }
            // Detach property-change callbacks so we don't leak them when
            // the question is destroyed.
            if (question && typeof question.unRegisterFunctionOnPropertyValueChanged === "function") {
                var listeners = [
                    { prop: "videoFit",       key: "videoQuestionLayout-videoFit" },
                    { prop: "videoHeight",    key: "videoQuestionLayout-videoHeight" },
                    { prop: "videoWidth",     key: "videoQuestionLayout-videoWidth" },
                    { prop: "videoUrl",       key: "videoQuestionSync-videoUrl" },
                    { prop: "startTimestamp", key: "videoQuestionSync-startTimestamp" },
                    { prop: "endTimestamp",   key: "videoQuestionSync-endTimestamp" }
                ];
                listeners.forEach(function (entry) {
                    try {
                        question.unRegisterFunctionOnPropertyValueChanged(entry.prop, entry.key);
                    } catch (e) {}
                });
            }
            // Drop the readOnlyChangedCallback we installed.
            if (question) {
                try { question.readOnlyChangedCallback = null; } catch (e) {}
            }
        }
    };

    if (Survey.CustomWidgetCollection &&
        Survey.CustomWidgetCollection.Instance &&
        !Survey.CustomWidgetCollection.Instance.getCustomWidgetByName(COMPONENT_NAME)) {
        Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");
    }
})();
