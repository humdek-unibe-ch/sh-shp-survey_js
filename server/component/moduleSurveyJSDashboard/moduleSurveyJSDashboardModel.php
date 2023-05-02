<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../moduleSurveyJS/ModuleSurveyJSModel.php";
/**
 * This class is used to prepare all data related to the cmsPreference component such
 * that the data can easily be displayed in the view of the component.
 */
class ModuleSurveyJSDashboardModel extends ModuleSurveyJSModel
{

    /* Constructors ***********************************************************/

    /**
     * The constructor.
     *
     * @param array $services
     *  An associative array holding the different available services. See the
     *  class definition BasePage for a list of all services.
     */
    public function __construct($services)
    {
        parent::__construct($services);
    }

    /**
     * Get all surveys results
     * @param int $sid
     * Survey id
     * @return array
     * Return an array with the results
     */
    public function get_survey_results($sid)
    {
        if (!$sid) {
            // return empty array
            return array();
        } else {
            $survey_results = array();
            $survey = $this->get_survey($sid);
            $form_id = $this->user_input->get_form_id($survey['survey_generated_id'], FORM_EXTERNAL);
            if ($form_id) {
                $res =  $this->user_input->get_data($form_id, '', false, FORM_EXTERNAL);
                foreach ($res as $key => $value) {
                    if (isset($value['_json'])) {
                        $survey_results[] = json_decode($value['_json']);
                    }
                }
            }
            return $survey_results;
        }
    }
}
