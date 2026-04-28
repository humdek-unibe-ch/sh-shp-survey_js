# SelfHelp Plugin - SurveyJS Integration

A comprehensive SelfHelp plugin that integrates [SurveyJS](https://surveyjs.io) functionality into your SelfHelp platform, providing advanced survey creation, management, and data collection capabilities.

## Overview

This plugin enables you to create, customize, and manage interactive surveys using the powerful SurveyJS library. It includes features for survey creation, versioning, response collection, and data visualization through a dashboard interface.

## Requirements

- SelfHelp v7.3.1+ (for full functionality)
- MySQL database with adequate `max_allowed_packet` size (recommended >1MB for file uploads)

## Installation

1. Download the code into the `server/plugins` folder
2. Checkout the latest version
3. Execute all `.sql` scripts in the DB folder in their version order
4. If using file uploads in surveys, adjust the `max_allowed_packet` size in your MySQL .ini file (default is 1MB)

## Key Features

### Survey Creation and Management
- Built-in SurveyJS Creator interface
- Survey versioning system
- Survey activation scheduling with start/end times
- Auto-save functionality with configurable intervals
- File upload support (including voice recordings)
- PDF export capability

### Custom Question Types
- **Rich Text Editor** (`quill`): Markdown/HTML rich text input.
- **Video** (`video`, since v1.4.8): standalone custom question that
  plays an HTML5 video. The URL is in the `videoUrl` property —
  root-relative paths such as `/assets/video.mp4` are resolved against
  the PHP `BASE_PATH` constant, both at runtime and in the Survey
  Creator preview. Drag-and-drop and direct file upload are disabled
  by design — only URLs are accepted.

  `startTimestamp` and `endTimestamp` (seconds) are **optional**, with
  no defaults — leaving them blank in the property panel means "play
  the whole file". Set them to enforce a sub-segment: with both set
  the segment is seek-clamped at both ends, hard-paused at
  `endTimestamp`, and replays snap back to `startTimestamp`. Either
  side can be set on its own to skip an intro or cap a trailer.
  `endTimestamp === 0` is treated the same as "not set" so the
  property-panel's number editor displaying a blank field as `0`
  doesn't surface a spurious validation error. The widget
  continuously persists a structured snapshot of playback state to
  the question's value (last position, watched seconds, percent
  watched, start / last-update / completion timestamps, last event).
  Optional `videoFit` / `videoHeight` / `videoWidth` properties are
  applied directly to the `<video>` element. Useful both for plain
  "watch this video" prompts and for "watch this excerpt and answer"
  workflows. See [`docs/VIDEO_SEGMENT.md`](docs/VIDEO_SEGMENT.md).

### Response Collection
- Comprehensive metadata collection (start/end times, duration, user agent, etc.)
- Timeout settings for survey sessions
- Configurable access controls (own_entries_only mode)
- Edit mode for existing responses

### Page Navigation Control
- Reset answers when returning to previous pages (resetOnBack property)
- Redirect options after survey completion

### Dynamic Content

#### Dynamic Dropdown Values from RESTful Service

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

#### Dynamic Survey JSON Replacement

The `dynamic_replacement` feature allows complex dynamic content in your surveys:

1. **How it Works**
   - Copy your survey JSON into the `dynamic_replacement` field
   - Use the mapper to define dynamic replacements
   - If this field contains content, it takes priority over the dropdown-selected survey

2. **Usage**
   - When empty: System uses the survey selected in the dropdown
   - When filled: System uses this JSON with mapped replacements
   - Useful for surveys needing complex dynamic content or customization

### Response Limitations
- Configure surveys to be completed once per user
- Configure surveys to be completed once per schedule

## Dashboard

The plugin includes a comprehensive dashboard for viewing and analyzing survey responses, including:
- Response filtering and sorting
- Data visualization
- Export capabilities

## Documentation

- [Survey usage guide](docs/SURVEY_USAGE.md) — how to create/configure/test surveys in SelfHelp.
- [Video question type](docs/VIDEO_SEGMENT.md) — properties, playback rules, validation and examples.
- [`docs/examples/video-segment-example.json`](docs/examples/video-segment-example.json) — minimal SurveyJS JSON using the new question.
