const creatorOptions = {
    showLogicTab: true,
    isAutoSave: true,
    showTranslationTab: true
};
Survey.setLicenseKey(
    "ZWUzYjk4NjctYmYzMi00ZmFiLWFlODQtMGE4OTBjMTNiYTRkOzE9MjAyNC0wNC0yNSwyPTIwMjQtMDQtMjUsND0yMDI0LTA0LTI1"
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

const creator = new SurveyCreator.SurveyCreator(creatorOptions);
var published_json = '';

$(document).ready(function () {
    initSurveyCreator();
    initSurveysTable();
    initDeleteSurvey();
    initPublishSurvey();
});

function initSurveyCreator() {
    if ($("#surveyJSCreator").length > 0) {
        // Expose SelfHelp's BASE_PATH globally so custom widgets such as
        // videoSegment can resolve root-relative URLs (e.g. "/assets/x.mp4")
        // in the Creator preview. This mirrors what 4_surveyJS.js does for
        // the runtime view, but the Creator never loads 4_surveyJS.js, so
        // we must set the variable here too.
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

            // --- Video Segment toolbox customization (v1.4.7) ---
            // The videoSegment custom widget (5_videoSegmentWidget.js) is a
            // STANDALONE question type (parent="empty"), so the custom
            // widget's htmlTemplate is the entire renderer — there is no
            // file-upload / drag-and-drop affordance to remove.
            //
            // SurveyJS internally lowercases every registered class name
            // (Survey.Serializer.addClass("videoSegment", ...) is stored as
            // "videosegment"), so the canonical type name is "videosegment".
            // We use the lowercased name everywhere — toolbox lookup,
            // default JSON, isFit comparison — and rely on
            // surveyLocalization.qt.videosegment = "Video Segment" for the
            // human-facing label.
            //
            // The widget exposes the resolved icon name via
            // window.__videoSegmentIconName: it is "icon-video-segment" if
            // SurveyCreator.SvgRegistry was available and we registered our
            // own video-camera SVG, or "icon-image" as a built-in fallback
            // for builds that do not expose the SvgRegistry.
            const videoSegmentIcon = (typeof window.__videoSegmentIconName === "string" && window.__videoSegmentIconName)
                ? window.__videoSegmentIconName
                : "icon-image";
            let videoSegmentIndex = toolboxItems.findIndex((item) => item.name === "videosegment" || item.name === "videoSegment");
            const videoSegmentDefaultJson = {
                type: "videosegment",
                name: "video_segment",
                title: "Watch the video segment",
                videoUrl: "",
                startTimestamp: 0,
                endTimestamp: 30,
                videoFit: "contain"
            };
            if (videoSegmentIndex !== -1) {
                let videoSegmentItem = toolboxItems[videoSegmentIndex];
                videoSegmentItem.name = "videosegment";
                videoSegmentItem.title = "Video Segment";
                videoSegmentItem.iconName = videoSegmentIcon;
                videoSegmentItem.json = videoSegmentDefaultJson;
            } else {
                creator.toolbox.addItem({
                    name: "videosegment",
                    title: "Video Segment",
                    iconName: videoSegmentIcon,
                    json: videoSegmentDefaultJson
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

        // Cross-field property validation for the videoSegment question:
        // SurveyJS' built-in `isRequired`/`minValue` already cover
        // missing-or-negative values; this hook adds the "start < end" rule
        // which depends on two properties at once and so cannot be expressed
        // statically via Survey.Serializer.addClass.
        if (creator.onPropertyValidationCustomError) {
            creator.onPropertyValidationCustomError.add((_, options) => {
                // SurveyJS lowercases every class name; getType() returns
                // "videosegment" even though we register "videoSegment".
                if (!options.obj || options.obj.getType() !== "videosegment") return;
                const propName = options.propertyName;
                if (propName !== "startTimestamp" && propName !== "endTimestamp") return;

                const start = parseFloat(options.obj.startTimestamp);
                const end = parseFloat(options.obj.endTimestamp);
                if (isNaN(start) || isNaN(end)) return; // isRequired covers this

                if (start < 0 || end < 0) {
                    options.error = "Timestamps must be greater than or equal to 0";
                } else if (start >= end) {
                    options.error = "startTimestamp must be strictly less than endTimestamp";
                }
            });
        }

        // Hide a few inherited "empty" properties that don't make sense
        // for a videoSegment — its value is auto-generated playback
        // metadata ({ watched, currentTime, completedAt, reason }), so
        // there is no point letting the survey designer set a default value
        // or a correct answer. Everything else they need is already in the
        // General / Layout categories.
        const VIDEO_SEGMENT_HIDDEN_PROPS = [
            "defaultValue",
            "correctAnswer"
        ];
        if (creator.onShowingProperty) {
            creator.onShowingProperty.add((_, options) => {
                // SurveyJS lowercases every class name; getType() returns
                // "videosegment" even though we register "videoSegment".
                if (!options.obj || options.obj.getType() !== "videosegment") return;
                if (VIDEO_SEGMENT_HIDDEN_PROPS.indexOf(options.property.name) !== -1) {
                    options.canShow = false;
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
    var survey_name = JSON.parse(creator.text)['title'];
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

function initPublishSurvey() {
    $("#survey-js-publish").off('click').on('click', (e) => {
        e.preventDefault();
        publishSurvey();
    });
}

function publishSurvey() {
    var surveyJson = JSON.parse(creator.text);
    var survey_name = surveyJson.title.default || surveyJson.title;
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