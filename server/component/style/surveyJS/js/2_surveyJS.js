$(document).ready(function () {
    initSurveyJS();
});

function initSurveyJS() {
    // Survey.StylesManager.applyTheme("modern");
    $('.selfHelp-survey-js').each(function () {        
        console.log(this);
        var surveyContent = $(this).data('survey-js');
        var surveyFields = $(this).data('survey-js-fields');
        $(this).removeAttr('data-survey-js');
        $(this).removeAttr('data-survey-js-fields');
        var survey = new Survey.Model(surveyContent);
        var currentLocale = $(this).attr("class").split(" ").filter(function (className) {
            return className.startsWith("selfHelp-locale-");
        });
        survey.locale = currentLocale[0].replace('selfHelp-locale-', '');
        if (!surveyFields['restart_on_refresh']) {
            // Restore survey results
            const notCompletedSurvey = window.localStorage.getItem(surveyContent['survey_generated_id']) || null;
            if (notCompletedSurvey) {
                survey.data = JSON.parse(notCompletedSurvey);
                if (survey.data.pageNo) {
                    survey.currentPageNo = survey.data.pageNo;
                }
            }
            saveSurveyJS(surveyFields, survey);
        }
        if (!survey.data['response_id']) {
            const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
            survey.setValue('response_id', "RJS_" + uniqueId.substring(uniqueId.length - 16));
            survey.setValue('trigger_type', 'started');
            survey.setValue('survey_generated_id', surveyContent['survey_generated_id']);
            saveSurveyJS(surveyFields, survey);
        }
        $(this).Survey({ model: survey });
        survey.onCurrentPageChanged.add((sender, options) => {
            sender.setValue('trigger_type', 'updated');
            saveSurveyJS(surveyFields, sender);
        });
        survey.onComplete.add((sender, options) => {
            sender.setValue('trigger_type', 'finished');
            saveSurveyJS(surveyFields, sender);
        });
    });
}

function saveSurveyJS(surveyFields, survey) {
    data = { ...survey.data };
    data.pageNo = survey.currentPageNo;
    if (!surveyFields['restart_on_refresh'] && data['survey_generated_id']) {
        window.localStorage.setItem(data['survey_generated_id'], JSON.stringify(data));
    }
    data['_json'] = JSON.stringify(data);
    console.log("save", data);
    $.ajax({
        type: 'post',
        url: window.location,
        data: data,
        success: function (r) {
            if (data['trigger_type'] == 'finished') {
                // on successful save on completed survey remove the local storage data
                window.localStorage.removeItem(data['survey_generated_id']);
                if (surveyFields['redirect_at_end']) {
                    window.location.href = surveyFields['redirect_at_end'];
                }
            }
        }
    });
}