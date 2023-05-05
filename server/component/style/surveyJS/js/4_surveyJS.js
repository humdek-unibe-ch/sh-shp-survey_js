var autoSaveTimers = {};

$(document).ready(function () {
    initSurveyJS();
});

function initSurveyJS() {
    $('.selfHelp-survey-js-holder').each(function () {
        const surveyContent = $(this).data('survey-js');
        const surveyFields = $(this).data('survey-js-fields');
        $(this).removeAttr('data-survey-js');
        $(this).removeAttr('data-survey-js-fields');
        Survey.StylesManager.applyTheme(surveyFields['survey_js_theme']);
        var survey = new Survey.Model(surveyContent);
        var currentLocale = $(this).attr("class").split(" ").filter(function (className) {
            return className.startsWith("selfHelp-locale-");
        });
        survey.locale = currentLocale[0].replace('selfHelp-locale-', '');
        if (surveyFields && surveyFields['auto_save_interval'] > 0) {
            // set autosave functionality
            autoSaveTimers[surveyFields['survey_generated_id']] = window.setInterval(() => {
                survey.setValue('trigger_type', 'updated'); // change the trigger type to updated
                saveSurveyJS(surveyFields, survey);
            }, surveyFields['auto_save_interval'] * 1000);
        }

        if (surveyFields && !surveyFields['restart_on_refresh']) {
            // Restore survey results
            const notCompletedSurvey = window.localStorage.getItem(surveyFields['survey_generated_id']) || null;
            if (notCompletedSurvey) {
                survey.data = JSON.parse(notCompletedSurvey);
                survey.setValue('trigger_type', 'updated');
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
            survey.setValue('survey_generated_id', surveyFields['survey_generated_id']);
            saveSurveyJS(surveyFields, survey);
        }
        $(this).children(".selfHelp-survey-js").first().Survey({ model: survey });
        survey.onCurrentPageChanged.add((sender, options) => {
            sender.setValue('trigger_type', 'updated');
            saveSurveyJS(surveyFields, sender);
        });
        survey.onComplete.add((sender, options) => {
            if (surveyFields && surveyFields['auto_save_interval'] > 0) {
                // clear the timer when the survey is finished
                clearInterval(autoSaveTimers[surveyFields['survey_generated_id']]);
            }
            sender.setValue('trigger_type', 'finished');
            saveSurveyJS(surveyFields, sender);
        });

        if (surveyFields && surveyFields['save_pdf'] == 1) {
            
            const exportToPdfOptions = {
                haveCommercialLicense: true
            };
            const savePdf = function (surveyData) {
                const surveyPdf = new SurveyPDF.SurveyPDF(surveyContent, exportToPdfOptions);
                surveyPdf.data = surveyData;
                surveyPdf.save(surveyContent.title.default || surveyContent.title);
            };

            survey.addNavigationItem({
                id: "pdf-export",
                title: "Save as PDF",
                action: () => savePdf(survey.data)
            });
        }

    });
}

function saveSurveyJS(surveyFields, survey) {
    var data = { ...survey.data };
    data.pageNo = survey.currentPageNo;
    if (!surveyFields['restart_on_refresh'] && data['survey_generated_id']) {
        window.localStorage.setItem(data['survey_generated_id'], JSON.stringify(data));
    }
    data['_json'] = JSON.stringify(data);
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