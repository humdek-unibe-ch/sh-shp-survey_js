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
                var localSurveyData = JSON.parse(notCompletedSurvey);
                var timeoutExpired = checkTimeout(surveyFields['timeout'], localSurveyData);
                if (!timeoutExpired) {
                    // load the survey if not expired based on the configuration
                    survey.data = localSurveyData;
                    survey.setValue('trigger_type', 'updated');
                    if (survey.data.pageNo) {
                        survey.currentPageNo = survey.data.pageNo;
                    }
                }
            }
            saveSurveyJS(surveyFields, survey);
        }
        if (!survey.data['response_id']) {
            var dateNow = Date.now();
            const uniqueId = dateNow.toString(36) + Math.random().toString(36).substring(2, 7);
            survey.setValue('response_id', "RJS_" + uniqueId.substring(uniqueId.length - 16));
            survey.setValue('trigger_type', 'started');
            survey.setValue('survey_generated_id', surveyFields['survey_generated_id']);
            var metaData = {};
            metaData['user_agent'] = navigator.userAgent;
            metaData['screen_width'] = window.screen.width;
            metaData['screen_height'] = window.screen.height;
            metaData['pixel_ratio'] = window.devicePixelRatio;
            metaData['viewport_width'] = window.innerWidth;
            metaData['viewport_height'] = window.innerHeight;
            metaData['start_time'] = new Date(dateNow);
            metaData['pages'] = [];
            metaData['pages'].push({
                'pageNo': survey.currentPageNo,
                'start_time': new Date(dateNow)
            });
            survey.setValue('_meta', metaData);
            if (surveyFields['extra_params']) {
                for (let prop in surveyFields['extra_params']) {
                    survey.setValue("extra_param_" + prop, surveyFields['extra_params'][prop]);
                }
            }
            saveSurveyJS(surveyFields, survey);
        }
        $(this).children(".selfHelp-survey-js").first().Survey({ model: survey });
        survey.onCurrentPageChanged.add((sender, options) => {
            var dateNow = Date.now();
            var meta = survey.getValue('_meta');
            meta['pages'][meta['pages'].length - 1]['end_time'] = new Date(dateNow);
            meta['pages'][meta['pages'].length - 1]['duration'] = ((dateNow - new Date(meta['pages'][meta['pages'].length - 1]['start_time'])) / 1000);
            meta['pages'].push({
                'pageNo': survey.currentPageNo,
                'start_time': new Date(dateNow)
            });
            sender.setValue('trigger_type', 'updated');
            survey.setValue('_meta', meta);
            saveSurveyJS(surveyFields, sender);
        });
        survey.onComplete.add((sender, options) => {
            if (surveyFields && surveyFields['auto_save_interval'] > 0) {
                // clear the timer when the survey is finished
                clearInterval(autoSaveTimers[surveyFields['survey_generated_id']]);
            }
            sender.setValue('trigger_type', 'finished');
            var dateNow = Date.now();
            var meta = survey.getValue('_meta');
            meta['duration'] = (dateNow - new Date(meta['start_time'])) / 1000; // save duration in seconds
            meta['end_time'] = new Date(dateNow);
            meta['pages'][meta['pages'].length - 1]['end_time'] = new Date(dateNow);
            meta['pages'][meta['pages'].length - 1]['duration'] = ((dateNow - new Date(meta['pages'][meta['pages'].length - 1]['start_time'])) / 1000);
            survey.setValue('_meta', meta);
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

/**
 * Checks if a timeout has occurred based on the elapsed time since a survey started.
 *
 * @param {number} timeout - The timeout duration in minutes. Set to 0 if not configured.
 * @param {Object} localSurvey - The survey object containing survey data and metadata.
 * @returns {boolean} True if a timeout has occurred, false otherwise.
 */
function checkTimeout(timeout, localSurvey) {
    if (timeout == 0) {
        // not configured
        return false;
    } else {
        var time_passed = (Date.now() - new Date(localSurvey['_meta']['start_time'])) / (1000 * 60); // in minutes
        if (time_passed > timeout) {
            return true;
        } else {
            return false;
        }
    }
}

/**
 * Saves survey data to the server and handles local storage.
 *
 * @param {Object} surveyFields - An object containing survey-specific configuration.
 * @param {Object} survey - The survey object containing survey data and information.
 */
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