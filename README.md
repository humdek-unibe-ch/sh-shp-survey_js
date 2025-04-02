# SelfHelp plugin - survey-js

This is a SelfHelpPlugin that is used for [SurveyJS](https://surveyjs.io) integration


# Installation

 - Download the code into the `server/plugins` folder
 - Checkout the latest version 
 - Execute all `.sql` script in the DB folder in their version order
 - If there is a survey with upload files, the files are store in the DB. Then it should be adjusted the size `max_allowed_packet` in MYSQL .ini file. The default one is 1MB

# Requirements

 - SelfHelp v6.2.0+

# Loading Dropdown Values from RESTful Service

To load dropdown values dynamically from a RESTful service, follow these steps:

1. **Page Configuration**
   - When creating a survey page, use the advanced example format: `/survey-js/[v:data]`
   - Here, `data` is a variable name that will be used to search for the retrieved data
   - The retrieved data must be in JSON format
   - Important: Do not use scope in the data configuration

2. **SurveyJS Configuration**
   - In SurveyJS, locate the "Choices from RESTful service" setting
   - Set the URL using the format: `your-domain.com/survey-js/TableName`
     - Example: If your survey is on page `survey-js` and your table is named `Task`, use: `test.com/survey-js/Task`
   - Configure the dropdown mapping:
     - In the "values" field: Set the table column name that should be used as the value
     - In the "display text" field: Set the table column name that should be shown to users

This setup allows you to dynamically populate dropdown options from your database through a RESTful service.
