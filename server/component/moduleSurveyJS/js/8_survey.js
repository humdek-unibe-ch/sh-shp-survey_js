const creatorOptions = {
    showLogicTab: true,
    isAutoSave: true,
    showTranslationTab: true
};
Survey.setLicenseKey(
    "ZWUzYjk4NjctYmYzMi00ZmFiLWFlODQtMGE4OTBjMTNiYTRkOzE9MjAyNC0wNC0yNSwyPTIwMjQtMDQtMjUsND0yMDI0LTA0LTI1"
);
window['surveyjs-widgets'].microphone(Survey);
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
    console.log(JSON.parse(creator.text));
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
                                ['#survey-js-publish', '#survey-js-publish-at'].forEach(element => {
                                    $(element).replaceWith($(data).find(element));
                                });
                                initPublishSurvey();
                                published_json = JSON.stringify($(data).find("#surveyJSCreator").data("config-published")); //after the publish take the new json as published
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
        { surveyJson: surveyJson },
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