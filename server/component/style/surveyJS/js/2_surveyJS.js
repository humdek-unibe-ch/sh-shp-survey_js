$(document).ready(function () {
    initSurveyJS();
});

function initSurveyJS() {
    // Survey.StylesManager.applyTheme("modern");
    $('.selfHelp-survey-js').each(function () {
        var survey = new Survey.Model($(this).data('survey-js'));
        $(this).Survey({ model: survey });
    });
}