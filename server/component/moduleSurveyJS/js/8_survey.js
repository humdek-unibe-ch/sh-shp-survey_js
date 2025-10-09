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
                            if (data) {
                                location.reload();
                            }
                            else {
                                alert("Error while autosaving the Survey");
                            }
                        }
                    );
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
        function (data) {
            if (data) {
                if (JSON.stringify(surveyJson) != published_json) {
                    $('#survey-js-publish').removeClass('disabled');
                } else {
                    $('#survey-js-publish').addClass('disabled');
                }
            }
            else {
                alert("Error while autosaving the Survey");
            }
        }
    );
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