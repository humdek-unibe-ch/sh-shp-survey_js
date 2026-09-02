
const creatorOptions = {
    showLogicTab: true,
    autoSaveEnabled: true,
    showTranslationTab: true
};
Survey.setLicenseKey(
    "ZWUzYjk4NjctYmYzMi00ZmFiLWFlODQtMGE4OTBjMTNiYTRkOzE9MjAyNy0wNi0xNCwyPTIwMjctMDYtMTQsND0yMDI3LTA2LTE0"
);
Survey.Serializer.addProperty("page", {
    name: "resetOnBack:boolean",
    category: "SelfHelp",
    default: false,
    displayName: "Reset answers when returning to page",
    description: "If enabled, all answers on this page will be cleared when the user navigates back to it."
});

window['surveyjs-widgets'].microphone(Survey);

// --- Quill Widget Registration ---
(function registerQuillWidget() {
    const componentName = "quill";
    const iconId = "icon-editor";
    var widget = {
        name: componentName,
        title: "Quill",
        iconName: iconId,
        widgetIsLoaded: function () {
            return typeof Quill !== "undefined";
        },
        isFit: function (question) {
            return question.getType() === componentName;
        },
        activatedByChanged: function (activatedBy) {
            Survey.Serializer.addClass(componentName, [], null, "empty");
            let registerQuestion = Survey.ElementFactory.Instance.registerCustomQuestion;
            if (!!registerQuestion) registerQuestion(componentName);
            Survey.Serializer.addProperty(componentName, {
                name: "height",
                default: "200px",
                category: "layout"
            });
        },
        htmlTemplate: "<div></div>",
        afterRender: function (question, el) {
            el.style.height = question.height;
            var editor = new Quill(el, {
                theme: "snow"
            });
            editor.enable(!question.isReadOnly);
            var isValueChanging = false;
            editor.on("text-change", function (eventName, ...args) {
                isValueChanging = true;
                question.value = editor.root.innerHTML;
                isValueChanging = false;
            });
            var updateValueHandler = function () {
                if (isValueChanging) return;
                const text = question.value || "";
                editor.root.innerHTML = text;
            };
            question.valueChangedCallback = updateValueHandler;
            question.readOnlyChangedCallback = function () {
                editor.enable(!question.isReadOnly);
            };
            updateValueHandler();
        },
        willUnmount: function (question, el) { }
    };
    if (!Survey.Serializer.findClass(componentName)) {
        Survey.CustomWidgetCollection.Instance.addCustomWidget(widget, "customtype");
    }
    // Register as property grid editor
    if (typeof SurveyCreatorCore !== "undefined" && SurveyCreatorCore.PropertyGridEditorCollection) {
        SurveyCreatorCore.PropertyGridEditorCollection.register({
            fit: function (prop) {
                return prop.type == "text";
            },
            getJSON: function () {
                return { type: "quill" };
            }
        });
    }
})();

function applyHtml(_, options) {
    let str = options.text;
    if (typeof str === "string" && str.indexOf("<p>") === 0) {
        str = str.substring(3);
        str = str.substring(0, str.length - 4);
    }
    options.html = str;
}

// Constructed on DOM ready: the v3 Creator probes computed styles against
// document.body while initialising its theme variables, and this script loads
// in <head>, where document.body is still null.
let creator;
var published_json = '';

$(document).ready(function () {
    creator = new SurveyCreator.SurveyCreator(creatorOptions);
    initSurveyCreator();
    initSurveysTable();
    initDeleteSurvey();
    initPublishSurvey();
});

function initSurveyCreator() {
    if ($("#surveyJSCreator").length > 0) {
        // Expose SelfHelp's BASE_PATH globally so custom widgets such as
        // the `video` question can resolve root-relative URLs
        // (e.g. "/assets/x.mp4") in the Creator preview. This mirrors what
        // 4_surveyJS.js does for the runtime view, but the Creator never
        // loads 4_surveyJS.js, so we must set the variable here too.
        //
        // Read via .attr() rather than .data(): jQuery's .data() auto-coerces
        // values that look like JSON / numbers, which can produce surprises
        // for path-shaped strings.
        if (typeof window.SELFHELP_BASE_PATH === "undefined") {
            const basePathFromAttr = $("#surveyJSCreator").attr("data-base-path");
            window.SELFHELP_BASE_PATH = (typeof basePathFromAttr === "string") ? basePathFromAttr : "";
        }
        creator.saveSurveyFunc = () => {
            autoSaveTheSurvey(creator.JSON);
        };
        if ($("#surveyJSCreator").data("config")) {
            creator.text = JSON.stringify($("#surveyJSCreator").data("config"));
        }
        if ($("#surveyJSCreator").data("config-published")) {
            published_json = JSON.stringify($("#surveyJSCreator").data("config-published"));
            $("#surveyJSCreator").removeAttr("data-config-published");
        }
        // Ensure Quill is present in the toolbox and at the top
        if (creator.toolbox) {
            let toolboxItems = creator.toolbox.items;
            let quillIndex = toolboxItems.findIndex((item) => item.name === "quill");
            if (quillIndex !== -1) {
                let quillItem = toolboxItems.splice(quillIndex, 1)[0];
                quillItem.title = "Rich Text Editor";
                quillItem.iconName = "icon-comment";
                toolboxItems.unshift(quillItem);
            } else {
                creator.toolbox.addItem({
                    name: "quill",
                    title: "Rich Text Editor",
                    iconName: "icon-comment",
                    json: {
                        type: "quill",
                        name: "rich-text-editor",
                        title: "Rich Text Editor",
                        defaultValue: ""
                    }
                });
                // Move to top
                let toolboxItems = creator.toolbox.items;
                let quillIndex = toolboxItems.findIndex((item) => item.name === "quill");
                if (quillIndex !== -1) {
                    let quillItem = toolboxItems.splice(quillIndex, 1)[0];
                    toolboxItems.unshift(quillItem);
                }
            }

            // --- Video question toolbox customization (v1.4.8) ---
            // The `video` custom widget (5_videoSegmentWidget.js) is a
            // STANDALONE question type (parent="empty"), so the custom
            // widget's htmlTemplate is the entire renderer — there is no
            // file-upload / drag-and-drop affordance to remove.
            //
            // The canonical type is `video` (lowercase — SurveyJS'
            // Serializer lowercases every registered class name).
            //
            // The widget exposes the resolved icon name via
            // window.__videoQuestionIconName: it is "icon-video-question"
            // when SurveyCreator.SvgRegistry was available and we
            // registered our own video-camera SVG, or "icon-image" as a
            // built-in fallback for builds that do not expose the
            // SvgRegistry.
            const videoIcon = (typeof window.__videoQuestionIconName === "string" && window.__videoQuestionIconName)
                ? window.__videoQuestionIconName
                : "icon-image";
            let videoToolboxIndex = toolboxItems.findIndex((item) => item.name === "video");
            // Default JSON for new questions added from the toolbox.
            // Timestamps are intentionally omitted: the default is "play
            // the entire file"; designers add timestamps only when they
            // want to enforce a sub-segment.
            const videoDefaultJson = {
                type: "video",
                name: "video_question",
                title: "Watch the video",
                videoUrl: "",
                videoFit: "contain"
            };
            if (videoToolboxIndex !== -1) {
                let videoItem = toolboxItems[videoToolboxIndex];
                videoItem.name = "video";
                videoItem.title = "Video";
                videoItem.iconName = videoIcon;
                videoItem.json = videoDefaultJson;
            } else {
                creator.toolbox.addItem({
                    name: "video",
                    title: "Video",
                    iconName: videoIcon,
                    json: videoDefaultJson
                });
            }

            // --- GPX question toolbox customization (v1.4.11) ---
            // The `gpx` custom widget (7_gpxQuestionWidget.js) is a
            // STANDALONE question type with parent "empty". The widget
            // exposes its resolved icon name via
            // window.__gpxQuestionIconName (either "icon-gpx-question"
            // when SvgRegistry is available, or "icon-file" as a
            // fallback).
            const gpxIcon = (typeof window.__gpxQuestionIconName === "string" && window.__gpxQuestionIconName)
                ? window.__gpxQuestionIconName
                : "icon-file";
            let gpxToolboxIndex = toolboxItems.findIndex((item) => item.name === "gpx");
            const gpxDefaultJson = {
                type: "gpx",
                name: "gpx_route",
                title: "Upload GPX route",
                sampledPointCount: 100
            };
            if (gpxToolboxIndex !== -1) {
                let gpxItem = toolboxItems[gpxToolboxIndex];
                gpxItem.name = "gpx";
                gpxItem.title = "GPX Route";
                gpxItem.iconName = gpxIcon;
                gpxItem.json = gpxDefaultJson;
            } else {
                creator.toolbox.addItem({
                    name: "gpx",
                    title: "GPX Route",
                    iconName: gpxIcon,
                    json: gpxDefaultJson
                });
            }
        }
        // Apply HTML markup to survey contents
        if (creator.survey) {
            creator.survey.onTextMarkdown.add(applyHtml);
        }
        if (creator.onSurveyInstanceCreated) {
            creator.onSurveyInstanceCreated.add((_, options) => {
                options.survey.onTextMarkdown.add(applyHtml);
            });
        }

        // Helper — true when the property panel is editing a `video`
        // question. SurveyJS lowercases every class name internally so
        // the canonical (and only) match is "video".
        const isVideoQuestion = (obj) =>
            !!(obj && typeof obj.getType === "function" && obj.getType() === "video");

        // Helper — true when the property panel is editing a `gpx`
        // question. v1.4.11.
        const isGpxQuestion = (obj) =>
            !!(obj && typeof obj.getType === "function" && obj.getType() === "gpx");

        // Cross-field property validation (start < end) is intentionally
        // NOT hooked into `creator.onPropertyValidationCustomError`. That
        // event only re-runs for the property the user is currently
        // editing, so an error message attached to the OTHER property
        // (e.g. an error on Start that was set when End was briefly
        // smaller during typing) is never cleared by subsequent valid
        // edits — it stays latched even when the configuration becomes
        // valid. We saw this manifest as start=15 / end=45 (clearly
        // valid) still showing the cross-field error on both fields.
        //
        // Single-field non-negativity is covered declaratively by
        // `minValue: 0` on the timestamps in the Serializer, so SurveyJS'
        // built-in number editor handles those without any custom hook.
        //
        // The cross-field rule is now enforced exclusively in the runtime
        // widget (`5_videoSegmentWidget.js → getConfigError`). It surfaces
        // as a question-level red banner above the live preview / runtime
        // player, which is impossible to "latch" because the widget
        // self-clears its question errors on every re-render.

        // Hide a few inherited "empty" properties that don't make sense
        // for a video question — its value is auto-generated playback
        // metadata, so there is no point letting the survey designer set
        // a default value or a correct answer. Everything else they need
        // is already in the General / Layout categories.
        const VIDEO_QUESTION_HIDDEN_PROPS = [
            "defaultValue",
            "correctAnswer"
        ];
        // v1.4.11 — same rationale for the GPX question. Its main value
        // is the parsed-GPX payload (auto-generated from the uploaded
        // file) and the `_file` sibling field carries the upload
        // metadata. Default-value / correct-answer editors don't make
        // sense for either.
        const GPX_QUESTION_HIDDEN_PROPS = [
            "defaultValue",
            "correctAnswer"
        ];
        if (creator.onShowingProperty) {
            creator.onShowingProperty.add((_, options) => {
                if (isVideoQuestion(options.obj)) {
                    if (VIDEO_QUESTION_HIDDEN_PROPS.indexOf(options.property.name) !== -1) {
                        options.canShow = false;
                    }
                    return;
                }
                if (isGpxQuestion(options.obj)) {
                    if (GPX_QUESTION_HIDDEN_PROPS.indexOf(options.property.name) !== -1) {
                        options.canShow = false;
                    }
                    return;
                }
            });
        }
        creator.render("surveyJSCreator");
        $("#surveyJSCreator").removeAttr("data-config");
    }
}

function initDeleteSurvey() {
    $("#survey-js-delete-btn").off('click').on('click', (e) => {
        e.preventDefault();
        deleteSurvey();
    });
}

function deleteSurvey() {
    var survey_name = getSurveyDisplayTitle(JSON.parse(creator.text));
    if (survey_name) {
        $.confirm({
            title: 'Delete survey: <code>' + survey_name + "</code>",
            type: "red",
            content: '<p>This will delete the survey <code>' + survey_name + '</code> and all the data collected by this survey.</p><p>You must be absolutely certain that this is what you want. This operation cannot be undone! To verify, enter the name of the survey.</p> <input id="deleteValue" type="text" class="form-control" >',
            buttons: {
                confirm: function () {
                    if ($("#deleteValue").val() == survey_name) {
                        location.href = $("#survey-js-delete-btn").attr('href');
                    } else {
                        $.alert({
                            title: 'Delete Survey: ' + survey_name,
                            type: "red",
                            content: 'Failed to delete the page: The verification text does not match with the survey name.',
                        });
                    }
                },
                cancel: function () {
                }
            }
        });
    } else {
        $.alert({
            title: 'Delete Survey: <code>' + survey_name + "</code>",
            type: "red",
            content: 'Please first give a name to the survey and then delete it.',
        });
    }

}

/**
 * SurveyJS title may be a plain string or a localized object
 * (`{ default: "…" }` / `{ en: "…" }`). Never read `.default` until
 * we know `title` is an object — a missing title used to throw on Publish.
 */
function getSurveyDisplayTitle(surveyJson) {
    var title = surveyJson && surveyJson.title;
    if (title == null || title === '') {
        return '';
    }
    if (typeof title === 'string') {
        return title;
    }
    if (typeof title === 'object') {
        if (title.default) {
            return title.default;
        }
        if (title.en) {
            return title.en;
        }
        for (var key in title) {
            if (Object.prototype.hasOwnProperty.call(title, key) && title[key]) {
                return title[key];
            }
        }
    }
    return '';
}

function initPublishSurvey() {
    $("#survey-js-publish").off('click').on('click', (e) => {
        e.preventDefault();
        publishSurvey();
    });
}

function publishSurvey() {
    var surveyJson = JSON.parse(creator.text);
    var survey_name = getSurveyDisplayTitle(surveyJson);
    if (survey_name) {
        $.confirm({
            title: 'Publish survey: <code>' + survey_name + "</code>",
            type: "orange",
            content: '<p>This will publish the survey <code>' + survey_name + '</code> and update its structure.',
            buttons: {
                confirm: function () {
                    $.post(
                        window.location,
                        { mode: "publish" },
                        function (data) {
                            if (data && data.success) {
                                location.reload();
                            } else {
                                $.alert({
                                    title: 'Publish Error',
                                    type: 'red',
                                    content: "Error while publishing the Survey: " + (data && data.error ? data.error : "Unknown error"),
                                    buttons: {
                                        ok: function() {
                                            location.reload();
                                        }
                                    }
                                });
                            }
                        }
                    ).fail(function(jqXHR, textStatus, errorThrown) {
                        $.alert({
                            title: 'Publish Error',
                            type: 'red',
                            content: "Error while publishing the Survey: " + textStatus,
                            buttons: {
                                ok: function() {
                                    location.reload();
                                }
                            }
                        });
                    });
                },
                cancel: function () {
                }
            }
        });
    } else {
        $.alert({
            title: 'Delete Survey: <code>' + survey_name + "</code>",
            type: "red",
            content: 'Please first give a name to the survey and then delete it.',
        });
    }

}

function autoSaveTheSurvey(surveyJson) {
    $.post(
        window.location,
        { surveyJson: JSON.stringify(surveyJson) },
        function (data, textStatus, jqXHR) {
            // Handle JSON response from server
            if (data && typeof data === 'object') {
                if (data.success) {
                    // Success - update publish button state
                    if (JSON.stringify(surveyJson) != published_json) {
                        $('#survey-js-publish').removeClass('disabled');
                    } else {
                        $('#survey-js-publish').addClass('disabled');
                    }
                } else {
                    // Server returned error
                    if (data.error === 'Authentication required' || data.error === 'Session expired') {
                        $.alert({
                            title: 'Session Expired',
                            type: 'red',
                            content: 'Your session has expired. Please refresh the page and log in again.',
                            buttons: {
                                ok: function() {
                                    location.reload();
                                }
                            }
                        });
                    } else {
                        $.alert({
                            title: 'Auto-save Error',
                            type: 'red',
                            content: "Error while autosaving the Survey: " + (data.error || "Unknown error"),
                            buttons: {
                                ok: function() {
                                    location.reload();
                                }
                            }
                        });
                    }
                }
            } else {
                // Unexpected response format
                $.alert({
                    title: 'Auto-save Error',
                    type: 'red',
                    content: "Error while autosaving the Survey: Invalid response from server",
                    buttons: {
                        ok: function() {
                            location.reload();
                        }
                    }
                });
            }
        }
    ).fail(function(jqXHR, textStatus, errorThrown) {
        // Handle HTTP errors (like 401 Unauthorized, 403 Forbidden)
        if (jqXHR.status === 401 || jqXHR.status === 403) {
            $.alert({
                title: 'Authentication Required',
                type: 'red',
                content: 'Your session has expired. Please log in again.',
                buttons: {
                    ok: function() {
                        location.reload();
                    }
                }
            });
        } else if (jqXHR.status === 302 || jqXHR.status === 301) {
            // Redirect response - likely session expired
            $.alert({
                title: 'Session Expired',
                type: 'red',
                content: 'Your session has expired. The page will reload.',
                buttons: {
                    ok: function() {
                        location.reload();
                    }
                }
            });
        } else {
            $.alert({
                title: 'Auto-save Error',
                type: 'red',
                content: "Error while autosaving the Survey: " + textStatus + " (" + jqXHR.status + ")",
                buttons: {
                    ok: function() {
                        location.reload();
                    }
                }
            });
        }
    });
}

function initSurveysTable() {
    var table = $('#surveys-js').DataTable({
        "order": [[0, "asc"]]
    });

    table.on('click', 'tr[id|="surveys-js-url"]', function (e) {
        var ids = $(this).attr('id').split('-');
        document.location = window.location + '/update/' + parseInt(ids[3]);
    });
}