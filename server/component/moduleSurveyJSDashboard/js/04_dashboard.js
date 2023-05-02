$(document).ready(function () {
    fetchSurveyResults();
});

function fetchSurveyResults() {
    $.post(
        window.location.href,
        { mode: "fetch_results" },
        function (data) {
            initSurveyDashboard(data);
        },
        'json'
    );
}

function initSurveyDashboard(survey_results) {
    if ($("#surveyJSDashboard").length > 0) {
        const surveyJson = $("#surveyJSDashboard").data('survey-js');
        $("#surveyJSDashboard").removeAttr('data-survey-js');
        const survey = new Survey.Model(surveyJson);

        const dashboardOptions = {
            allowHideQuestions: false,
            haveCommercialLicense: true
        }

        const surveyJSDashboard = new SurveyAnalytics.VisualizationPanel(
            survey.getAllQuestions(),
            survey_results,
            dashboardOptions
        );

        surveyJSDashboard.render("surveyJSDashboard");
    }
}