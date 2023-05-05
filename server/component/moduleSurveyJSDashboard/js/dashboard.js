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
            haveCommercialLicense: true,
        }

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
                    name: "user_name",
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
            haveCommercialLicense: true,
            downloadOptions: { fileName: surveyId + '_[' + year + '_' + month + '_' + day + '-' + hours + '_' + minutes + ']' }
        }

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
        setTimeout(() => {
            surveyJSDashboardTable.layout();
        }, 10);
    }
}