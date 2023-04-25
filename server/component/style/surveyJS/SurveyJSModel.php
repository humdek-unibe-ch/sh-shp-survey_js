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

    /**
     * If checked the survey can be done once per schedule
     */
    private $once_per_schedule;

    /**
     * If checked the survey can be done only once by an user. The checkbox `once_per_schedule` is ignore if this is checked
     */
    private $once_per_user;

    /**
     * Start time when the survey should be available
     */
    private $start_time;

    /**
     * End time when the survey should be not available anymore
     */
    private $end_time;

    /**
     * Start time converted to date
     */
    private $start_time_calced;

    /**
     * End time converted to date and adjusted if smaller than start time
     */
    private $end_time_calced;    

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
        $this->once_per_schedule = $this->get_db_field('once_per_schedule', 0);        
        $this->once_per_user = $this->get_db_field('once_per_user', 0);
        $this->start_time = $this->get_db_field('start_time', '00:00');
        $this->end_time = $this->get_db_field('end_time', '00:00');
        $this->calc_times();
    }

    /* Private Methods ********************************************************/

    /* Private Methods *********************************************************/

    private function calc_times()
    {
        $d = new DateTime();
        $now = $d->setTimestamp(strtotime("now"));
        $at_start_time = explode(':', $this->start_time);
        $at_end_time = explode(':', $this->end_time);
        $start_time = $now->setTime($at_start_time[0], $at_start_time[1]);
        $start_time = date('Y-m-d H:i:s', $start_time->getTimestamp());
        $end_time = $now->setTime($at_end_time[0], $at_end_time[1]);
        $end_time = date('Y-m-d H:i:s', $end_time->getTimestamp());
        if (strtotime($start_time) > strtotime($end_time)) {
            // move end time to next day
            $end_time = date('Y-m-d H:i:s', strtotime($end_time . ' +1 day'));
        }
        $this->start_time_calced = $start_time;
        $this->end_time_calced = $end_time;
    }

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
        return false;
    }
}
?>
