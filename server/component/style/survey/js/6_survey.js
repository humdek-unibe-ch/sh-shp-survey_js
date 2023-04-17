
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

const creatorOptions = {
        showLogicTab: true,
        isAutoSave: true
    };
const creator = new SurveyCreator.SurveyCreator(creatorOptions);

$(document).ready(function () {
    initSurvey();
    initSurveyCreator();
});

function initSurveyCreator() {
    
    const defaultJson = {
        pages: [{
            name: "Name",
            elements: [{
                name: "FirstName",
                title: "Enter your first name:",
                type: "text"
            }, {
                name: "LastName",
                title: "Enter your last name:",
                type: "text"
            }]
        }]
    };
    
    creator.text = window.localStorage.getItem("survey-json") || JSON.stringify(defaultJson);
    creator.render("surveyContainer");
}


function initSurvey() {
    // Survey.StylesManager.applyTheme("modern");
    const survey = new Survey.Model(surveyJson);    
    ko.applyBindings({
        model: survey
    });
}