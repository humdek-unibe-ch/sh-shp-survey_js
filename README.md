# SelfHelp plugin - survey-js

This is a SelfHelpPlugin that is used for [SurveyJS](https://surveyjs.io) integration


# Installation

 - Download the code into the `server/plugins` folder
 - Checkout the latest version 
 - Execute all `.sql` script in the DB folder in their version order
 - If there is a survey with upload files, the files are store in the DB. Then it should be adjusted the size `max_allowed_packet` in MYSQL .ini file. The default one is 1MB

# Requirements

 - SelfHelp v6.2.0+

# Features

## Dynamic Dropdown Values from RESTful Service

To load dropdown values dynamically from a RESTful service:

1. **Page Configuration**
   - Create a survey page using the advanced format: `/survey-js/[v:data]`
   - Replace `data` with your variable name for data retrieval
   - The service must return data in JSON format
   - Important: Do not use scope in the data configuration

2. **SurveyJS Configuration**
   - In your dropdown question settings, find "Choices from RESTful service"
   - Set the URL pattern: `your-domain.com/survey-js/TableName`
     - Example: `test.com/survey-js/Task` (where `Task` is your table name)
   - Configure the dropdown fields:
     - "values": Select the column to use as option values
     - "display text": Select the column to show as readable text

## Dynamic Survey JSON Replacement

The `dynamic_replacement` feature allows complex dynamic content in your surveys:

1. **How it Works**
   - Copy your survey JSON into the `dynamic_replacement` field
   - Use the mapper to define dynamic replacements
   - If this field contains content, it takes priority over the dropdown-selected survey

2. **Usage**
   - When empty: System uses the survey selected in the dropdown
   - When filled: System uses this JSON with mapped replacements
   - Useful for surveys needing complex dynamic content or customization
