const creatorOptions = {
    showLogicTab: true,
    isAutoSave: true,
    haveCommercialLicense: true,
    showTranslationTab: true
};
const creator = new SurveyCreator.SurveyCreator(creatorOptions);

$(document).ready(function () {
    initSurveyCreator();
    initSurveysTable();
    initDeleteSurvey();
});

function initSurveyCreator() {
    if ($("#surveyJSCreator").length > 0) {
        creator.saveSurveyFunc = () => {
            autoSaveTheSurvey(creator.JSON);
        };
        if ($("#surveyJSCreator").data("config")) {
            creator.text = JSON.stringify($("#surveyJSCreator").data("config"));
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
    console.log(survey_name);
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

function autoSaveTheSurvey(surveyJson) {
    $.post(
        window.location,
        { surveyJson: surveyJson },
        function (data) {
            if (data.success) {

            }
            else {
                console.log(data);
                alert("Error while autosaving the Survey");
            }
        },
        'json'
    );
}

function initSurveysTable() {
    var table = $('#surveys-js').DataTable({
        "order": [[0, "asc"]]
    });

    table.on('click', 'tr[id|="surveys-js-url"]', function (e) {
        var ids = $(this).attr('id').split('-');
        console.log(ids);
        document.location = window.location + '/update/' + parseInt(ids[3]);
    });
}