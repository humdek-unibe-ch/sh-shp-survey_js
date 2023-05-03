<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<div id="surveyJSDashboard" data-survey-js='<?php echo isset($this->survey['config']) ?  htmlspecialchars($this->survey['config'], ENT_QUOTES, 'UTF-8') : ""; ?>' 
data-survey-js-id='<?php echo $this->survey['survey_generated_id'] ?>'>
</div>