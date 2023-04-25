$(document).ready(function () {
    initSurveyJS();
});

function initSurveyJS() {
    // Survey.StylesManager.applyTheme("modern");
    $('.selfHelp-survey-js').each(function () {
        var surveyContent = $(this).data('survey-js');
        console.log(surveyContent);
        var survey = new Survey.Model(surveyContent);
        if (!survey.data['response_id']) {
            const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
            survey.setValue('response_id', "RJS_" + uniqueId.substring(uniqueId.length - 16));
            survey.setValue('trigger_type', 'started');
            survey.setValue('survey_generated_id', surveyContent['survey_generated_id']);
            saveSurveyJS(survey.data);
        }
        $(this).Survey({ model: survey });
        console.log(survey.data);
        survey.onCurrentPageChanged.add((sender, options) => {            
            sender.setValue('trigger_type', 'updated');
            console.log('next page', sender.data);
            saveSurveyJS(sender.data);
        });
        survey.onComplete.add((sender, options) => {
            sender.setValue('trigger_type', 'finished');
            console.log('finished', sender.data);
            saveSurveyJS(sender.data);
        });
    });
}

function saveSurveyJS(data) {
    $.ajax({
        type: 'post',
        url: window.location,
        data: data,
        success: function (data) {
        }
    });
}