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

        // v1.4.11 — for every `gpx` question in the survey, append a
        // matching `<effectiveName>_file` text question so the tabulator
        // table renders a column for the uploaded-file metadata. Cells
        // in that column are later rewritten into clickable links by
        // `renderFileFieldLinks`.
        injectGpxFileColumns(surveyJson);

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

        // v1.4.11: render uploaded-file references (any tabulator field
        // whose name ends in `_file`) as clickable links. The cell
        // contains an upload-file metadata array stringified by the
        // table renderer; we recover it from the source `survey_results`
        // row instead of trying to parse the cell text.
        renderFileFieldLinks(survey_results);
    }
}

/**
 * Walk the survey JSON tree, collect every `gpx` question, and append a
 * sibling `<effectiveName>_file` text question on a dedicated extra
 * page so the tabulator dashboard renders a column for it. The widget
 * stores upload-file metadata under that name; cells are rewritten to
 * clickable links by `renderFileFieldLinks`.
 *
 * Idempotent: re-running it does not duplicate the appended page.
 */
function injectGpxFileColumns(surveyJson) {
    if (!surveyJson || !Array.isArray(surveyJson.pages)) return;
    var fileNames = [];

    function walk(el) {
        if (!el || typeof el !== 'object') return;
        if (el.type && String(el.type).toLowerCase() === 'gpx') {
            var effective = el.valueName || el.name;
            if (effective) fileNames.push(effective + '_file');
        }
        if (Array.isArray(el.elements)) el.elements.forEach(walk);
        if (Array.isArray(el.templateElements)) el.templateElements.forEach(walk);
    }
    surveyJson.pages.forEach(walk);

    if (fileNames.length === 0) return;
    var existingPage = surveyJson.pages.find(function (p) { return p && p.name === 'gpx_files'; });
    if (existingPage) return; // idempotent

    surveyJson.pages.push({
        name: 'gpx_files',
        elements: fileNames.map(function (n) {
            return { name: n, type: 'text', title: n };
        })
    });
}

/**
 * Walk every survey_results row, look up every key ending in `_file`,
 * and rewrite the matching tabulator cell as an anchor pointing at the
 * GPX/file path. Uses `record_id` (read from the sibling cell in the
 * same Tabulator row) to look up the right `survey_results` entry, so
 * sorting / filtering does not de-sync the link target.
 *
 * Idempotent: the next refresh re-binds.
 */
function renderFileFieldLinks(survey_results) {
    if (!Array.isArray(survey_results) || survey_results.length === 0) return;
    var fileFields = new Set();
    survey_results.forEach(function (row) {
        if (!row || typeof row !== 'object') return;
        Object.keys(row).forEach(function (k) {
            if (k.endsWith('_file')) fileFields.add(k);
        });
    });
    if (fileFields.size === 0) return;

    // Build an index by record_id for O(1) lookups.
    var byRecordId = {};
    survey_results.forEach(function (row) {
        if (row && row.record_id !== undefined && row.record_id !== null) {
            byRecordId[String(row.record_id)] = row;
        }
    });

    fileFields.forEach(function (field) {
        // Restrict to cells inside actual data rows (Tabulator gives
        // them the `tabulator-row` ancestor); header cells live under
        // `.tabulator-header` and are skipped.
        var cells = $('.tabulator-row [tabulator-field="' + field + '"]');
        cells.each(function () {
            var $cell = $(this);
            var $row  = $cell.closest('.tabulator-row');
            if (!$row.length) return;
            // Find the record_id cell within the same row.
            var rid = $row.find('[tabulator-field="record_id"]').text().trim();
            if (!rid) return;
            var row = byRecordId[rid];
            if (!row) return;
            var val = row[field];
            if (typeof val === 'string') {
                try { val = JSON.parse(val); } catch (e) { /* leave as-is */ }
            }
            if (!Array.isArray(val) || val.length === 0 || !val[0]) return;
            var entry = val[0];
            var name  = entry.name || 'file';
            var href  = entry.content || '';
            if (!href || typeof href !== 'string') return;
            // Server returns the link as `?file_path=…`; resolve against
            // the current dashboard URL so the controller serves it.
            var url = href.charAt(0) === '?'
                ? (window.location.pathname + href)
                : href;
            var anchor = $('<a/>', {
                href: url,
                target: '_blank',
                rel: 'noopener',
                class: 'sjs-gpx-file-link',
                text: name
            });
            $cell.empty().append(anchor);
        });
    });
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