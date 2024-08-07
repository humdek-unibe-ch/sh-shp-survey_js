$(document).ready(function () {
    fetchSurveyResults();
    $("#reset_dashboard").click(function (e) {
        e.preventDefault();
        const surveyId = $("#surveyJSTable").data('survey-js-id');
        $.confirm({
            title: 'Reset Dashboard',
            type: "red",
            content: '<p>This will reset the state of the table and dashboard for survey <code>' + surveyId + '</code>!</p>',
            buttons: {
                confirm: function () {
                    window.localStorage.removeItem(surveyId + "_DashboardPanel");
                    window.localStorage.removeItem(surveyId + "_DashboardTable");
                    fetchSurveyResults();
                },
                cancel: function () {
                }
            }
        });
    });
    $("#refresh_dashboard").click(function (e) {
        e.preventDefault();
        fetchSurveyResults();
    });
});

function fetchSurveyResults() {
    $.post(
        window.location.href,
        { mode: "fetch_results" },
        function (data) {
            initSurveyDashboard(data);
            initSurveyDashboardTable(data);
        },
        'json'
    );
}

function initSurveyDashboard(survey_results) {
    if ($("#surveyJSDashboard").length > 0) {

        const surveyJson = $("#surveyJSDashboard").data('survey-js');
        $("#surveyJSDashboard").removeAttr('data-survey-js');
        const survey = new Survey.Model(surveyJson);
        const surveyId = $("#surveyJSTable").data('survey-js-id');
        $("#surveyJSDashboard").removeAttr('data-survey-js-id');
        var localStorageSurveyDashboardPanel = window.localStorage.getItem(surveyId + "_DashboardPanel");

        const dashboardOptions = {
            allowHideQuestions: true,
        }
        Survey.setLicenseKey(
            "ZWUzYjk4NjctYmYzMi00ZmFiLWFlODQtMGE4OTBjMTNiYTRkOzE9MjAyNC0wNC0yNSwyPTIwMjQtMDQtMjUsND0yMDI0LTA0LTI1"
        );
        window['surveyjs-widgets'].microphone(Survey);

        const surveyJSDashboard = new SurveyAnalytics.VisualizationPanel(
            survey.getAllQuestions(),
            survey_results,
            dashboardOptions
        );

        if (!!localStorageSurveyDashboardPanel) {
            surveyJSDashboard.state = JSON.parse(localStorageSurveyDashboardPanel);
        }
        surveyJSDashboard.onStateChanged.add(function (_table, state) {
            window.localStorage.setItem(surveyId + "_DashboardPanel", JSON.stringify(state));
        });

        $("#surveyJSDashboard").empty();
        surveyJSDashboard.render("surveyJSDashboard");

        $('#nav-dashboard-tab').click(function () {
            if ($('.sa-visualizer__content').height() == 0) {
                // Element not shown
                setTimeout(() => {
                    surveyJSDashboard.layout();
                }, 300);
            }
        });
    }
}

function initSurveyDashboardTable(survey_results) {
    if ($("#surveyJSTable").length > 0) {
        const surveyJson = $("#surveyJSTable").data('survey-js');
        $("#surveyJSTable").removeAttr('data-survey-js');
        const surveyId = $("#surveyJSTable").data('survey-js-id');
        $("#surveyJSTable").removeAttr('data-survey-js-id');
        var localStorageSurveyDashboardTable = window.localStorage.getItem(surveyId + "_DashboardTable");

        // add extra params as questions so they can be visualized in the table
        var extra_params = [];
        for (var i = 0; i < survey_results.length; i++) {
            var obj = survey_results[i];
            for (var key in obj) {
                if (key.startsWith("extra_param_") && !extra_params.includes(key)) {
                    extra_params.push(key);
                }
            }
        }
        if (extra_params.length > 0) {
            var extra_params_q = {
                name: 'extra_params',
                elements: []
            }
            extra_params.forEach(extra_param => {
                extra_params_q.elements.push({
                    name: extra_param,
                    type: "text"
                });
            });
            surveyJson.pages.unshift(extra_params_q);
        }

        if (surveyJson.pages && surveyJson.pages.length > 0 && surveyJson.pages[0].name != 'internal_data') {
            surveyJson.pages.unshift({
                name: 'internal_data',
                elements: [{
                    name: "record_id",
                    type: "text"
                }, {
                    name: "response_id",
                    type: "text"
                }, {
                    name: "date",
                    type: "text"
                }, {
                    name: "id_users",
                    type: "text"
                }, {
                    name: "code",
                    type: "text"
                }, {
                    name: "pageNo",
                    type: "text"
                }, {
                    name: "trigger_type",
                    type: "text"
                }]
            });
        }

        const survey = new Survey.Model(surveyJson);

        var currentDate = new Date();
        var year = currentDate.getFullYear();
        var month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
        var day = ('0' + currentDate.getDate()).slice(-2);
        var hours = ('0' + currentDate.getHours()).slice(-2);
        var minutes = ('0' + currentDate.getMinutes()).slice(-2);

        const dashboardOptions = {
            allowHideQuestions: true,
            downloadOptions: { fileName: surveyId + '_[' + year + '_' + month + '_' + day + '-' + hours + '_' + minutes + ']' }
        }

        Survey.setLicenseKey(
            "ZWUzYjk4NjctYmYzMi00ZmFiLWFlODQtMGE4OTBjMTNiYTRkOzE9MjAyNC0wNC0yNSwyPTIwMjQtMDQtMjUsND0yMDI0LTA0LTI1"
        );

        const surveyJSDashboardTable = new SurveyAnalyticsTabulator.Tabulator(
            survey,
            survey_results,
            dashboardOptions
        );

        if (!!localStorageSurveyDashboardTable) {
            surveyJSDashboardTable.state = JSON.parse(localStorageSurveyDashboardTable);
        }
        surveyJSDashboardTable.onStateChanged.add(function (_table, state) {
            window.localStorage.setItem(surveyId + "_DashboardTable", JSON.stringify(state));
        });

        surveyJSDashboardTable.render("surveyJSTable");

        var microphoneQuestions = getMicrophoneQuestions(survey);

        // Iterate through the elements if needed
        microphoneQuestions.forEach(microphoneQuestion => {
            var elements = $('[tabulator-field="' + microphoneQuestion + '"]');
            elements.each(function () {
                var element = $(this);
                // Do something with each element
                var audio = $(element).attr('title');
                if (audio.includes('data:audio')) {
                    $(element).html('<audio class="surveyjs-dashboard-microphone" controls src="' + audio + '"></audio>');
                }
            });
        });

    }
}

/**
 * @brief Retrieves the names of all microphone questions in a SurveyJS survey.
 *
 * This function iterates through all the questions in the provided survey and collects
 * the names of those questions that are of the type 'microphone'.
 *
 * @param {Survey.Model} survey - The SurveyJS survey model instance.
 * @returns {Array<string>} An array containing the names of the microphone questions.
 *
 * @example
 * // Assuming you have a SurveyJS model instance named 'survey'
 * const survey = new Survey.Model(surveyJson);
 * const microphoneQuestionNames = getMicrophoneQuestions(survey);
 * console.log(microphoneQuestionNames);
 */
function getMicrophoneQuestions(survey) {
    // Initialize an array to store the microphone questions
    const microphoneQuestions = [];

    // Iterate through all the questions in the survey
    survey.getAllQuestions().forEach((question) => {
        // Check if the question type is 'microphone'
        if (question.getType() === 'microphone') {
            // Add the question to the array
            microphoneQuestions.push(question.name);
        }
    });

    return microphoneQuestions;
}