
const surveyJson = {
    elements: [{
        name: "FirstName",
        title: "Enter your first name:",
        type: "text"
    }, {
        name: "LastName",
        title: "Enter your last name:",
        type: "text"
    }]
};

$(document).ready(function () {
    console.log("survey-js");
    initSurvey();
});


function initSurvey() {
    Survey.StylesManager.applyTheme("defaultV2");
    window.survey = new Survey.Model(surveyJson);
    $("#surveyContainer").Survey({
        model: survey
    });
}