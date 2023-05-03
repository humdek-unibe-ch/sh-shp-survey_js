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
     * Get all validation codes and return them in array("id_users"=>"code")
     * @return array
     * return the codes in array("id_users"=>"code")
     */
    private function get_validation_codes_for_users()
    {
        $sql = 'SELECT *
                FROM validation_codes
                WHERE id_users > 0';
        $res = $this->db->query_db($sql);
        $codes = array();
        foreach ($res as $key => $value) {
            $codes[$value['id_users']] = $value['code'];
        }
        return $codes;
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
                $validation_code = $this->get_validation_codes_for_users();
                foreach ($res as $key => $value) {
                    if (isset($value['_json'])) {
                        $survey_raw_data = json_decode($value['_json']);
                        $survey_raw_data->record_id = $value['record_id'];
                        $survey_raw_data->date = $value['entry_date'];
                        $survey_raw_data->id_users = $value['id_users'];
                        $survey_raw_data->user_name = $value['user_name'];
                        $survey_raw_data->code = isset(($validation_code[$value['id_users']])) ? $validation_code[$value['id_users']] : "no code";
                        $survey_results[] = $survey_raw_data;
                    }
                }
            }
            return $survey_results;
        }
    }
}
