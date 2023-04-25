<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../../component/style/StyleModel.php";

/**
 * This class is used to prepare all data related to the form style
 * components such that the data can easily be displayed in the view of the
 * component.
 */
class SurveyJSModel extends StyleModel
{
    /* Private Properties *****************************************************/

    /* Constructors ***********************************************************/

    /**
     * The constructor fetches all session related fields from the database.
     *
     * @param array $services
     *  An associative array holding the different available services. See the
     *  class definition base page for a list of all services.
     * @param int $id
     *  The section id of the navigation wrapper.
     * @param array $params
     *  The list of get parameters to propagate.
     * @param number $id_page
     *  The id of the parent page
     * @param array $entry_record
     *  An array that contains the entry record information.
     */
    public function __construct($services, $id, $params)
    {
        parent::__construct($services, $id, $params);
    }

    /* Private Methods ********************************************************/

    /**
     * Get the survey
     * @return object
     * Return the row for the survey
     */
    private function get_raw_survey()
    {
        $sid = $this->get_db_field('survey-js', '');
        return $this->db->query_db_first("SELECT * FROM view_surveys WHERE id = :id", array(':id' => $sid));
    }

    /* Public Methods *********************************************************/

    /**
     * Get the survey and apply all dynamic variables
     * @return object
     * Return the info for the survey
     */
    public function get_survey()
    {
        $survey = $this->get_raw_survey();
        $user_name = $this->db->fetch_user_name();
        $user_code = $this->db->get_user_code();
        $survey['content'] = $survey['config'];
        $survey['name'] = 'survey-js';
        $data_config = $this->get_db_field('data_config');
        $survey['content'] = $this->calc_dynamic_values($survey, $data_config, $user_name, $user_code);
        return $survey;
    }

    /**
     * Save survey js data as external table
     * @param object $data
     * Object with the data that should be saved
     */
    public function save_survey($data)
    {
        $survey = $this->get_raw_survey();
        if (isset($survey['survey_generated_id']) && isset($data['survey_generated_id']) && $data['survey_generated_id'] == $survey['survey_generated_id']) {
            if (isset($data['trigger_type'])) {
                if ($data['trigger_type'] == actionTriggerTypes_started) {
                    $this->user_input->save_external_data(transactionBy_by_user, $data['survey_generated_id'], $data);
                } else {
                    $this->user_input->save_external_data(transactionBy_by_user, $data['survey_generated_id'], $data, array(
                        "response_id" => $data['response_id']
                    ));
                }
            }
        }
    }
}
?>
