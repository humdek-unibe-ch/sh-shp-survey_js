<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<div class="selfHelp-survey-js-holder <?php echo $this->css; ?>"
 data-survey-js='<?php echo isset($this->survey['content']) ?  htmlspecialchars($this->survey['content'], ENT_QUOTES, 'UTF-8') : ""; ?>' 
 data-survey-js-fields='<?php echo $survey_fields ?>'>
 <div class="selfHelp-survey-js"></div>
 </div>