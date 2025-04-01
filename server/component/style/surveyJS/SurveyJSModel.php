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
    public function __construct($services, $id, $params, $id_page = -1, $entry_record = array())
    {
        parent::__construct($services, $id, $params, $id_page, $entry_record);
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
            if (strtotime($end_time) > strtotime("now")) {
                //move start time to previous day
                $start_time = date('Y-m-d H:i:s', strtotime($start_time . ' -1 day'));
            } else {
                // move end time to next day
                $end_time = date('Y-m-d H:i:s', strtotime($end_time . ' +1 day'));
            }
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

    /**
     * Check if the survey is already done by the user
     * @retval boolean
     * true if it is already done, false if not
     */
    private function is_survey_done_by_user()
    {
        $form_name = $this->get_raw_survey()['survey_generated_id'];
        $form_id = $this->user_input->get_dataTable_id($form_name);
        $filter = ' AND trigger_type = "' . actionTriggerTypes_finished . '"'; // the survey should be completed
        if (!$form_id) {
            // if no form, the survey was never filled, so it is not done
            return false;
        }
        $res = $this->user_input->get_data($form_id, $filter, true, $_SESSION['id_user'], true);
        return $res;
    }

    /**
     * Check if the survey is already done by the user for the selected period
     * @retval boolean
     * true if it is already done, false if not
     */
    private function is_survey_done_by_user_for_schedule()
    {
        $form_name = $this->get_raw_survey()['survey_generated_id'];
        $form_id = $this->user_input->get_dataTable_id($form_name);
        $filter = ' AND trigger_type = "' . actionTriggerTypes_finished . '"'; // the survey should be completed
        $filter = $filter  . ' AND (entry_date BETWEEN "' . $this->start_time_calced . '" AND "' . $this->end_time_calced . '")'; // the survey should be completed between the time
        $res = $this->user_input->get_data($form_id, $filter, true, $_SESSION['id_user'], true);
        return $res;
    }

    private function prepare_data($data)
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                // this is array and we have to rework it
                if ($value === array_values($value)) {
                    // The array is indexed with numerical keys
                    if (is_array($value[0]) && isset($value[0]['type'])) {
                        // File upload, for now do not store it
                        unset($data[$key]); // remove the file upload; it is saved in the whole json for now
                    } else if (is_array($value[0]) && $value[0] !== array_values($value[0])) {
                        // this questions is panel with some repetition
                        $data[$key] = json_encode($value); // encode the data as json
                    } else {
                        $data[$key] = implode(',', $value);
                    }
                } else {
                    // add all children directly in the data        
                    foreach ($value as $val_key => $val_value) {
                        if (is_array($val_value)) {
                            $data[$key . "_" . $val_key] = json_encode($val_value); // the value is array, save it as json
                        } else {
                            $data[$key . "_" . $val_key] = $val_value;
                        }
                    }
                    unset($data[$key]); // remove the nested result
                }
            }
        }
        return $data;
    }

    /* Public Methods *********************************************************/

    /**
     * Get the survey and apply all dynamic variables
     * @return object | false
     * Return the info for the survey
     */
    public function get_survey()
    {
        $survey = $this->get_raw_survey();
        if (!$survey) {
            return false;
        }
        $id_dataTables = $this->user_input->get_dataTable_id($survey['survey_generated_id']);
        if ($id_dataTables) {
            $last_response = $this->user_input->get_data($id_dataTables, 'ORDER BY record_id DESC', true, $_SESSION['id_user'], true);
        }
        if (isset($last_response['_json'])) {
            $last_response_json = json_decode($last_response['_json'], true);
            $survey['last_response'] = $last_response_json['trigger_type'] != 'finished' ? $last_response_json : array();
        }
        if($this->entry_record) {
            $last_response = $this->load_response_survey_edit_mode($id_dataTables);
            if($last_response) {
                $survey['last_response'] = $last_response;
            }
        }
        $survey['content'] = isset($survey['published']) ? $survey['published'] : '';
        $survey['name'] = 'survey-js';
        $data_config = $this->get_db_field('data_config');
        $survey['section_name'] = $this->section_name;
        $survey['content'] = $this->calc_dynamic_values($survey, $data_config);
        return $survey;
    }

    /**
     * Save survey js data as external table
     * @param object $data
     * Object with the data that should be saved
     */
    public function save_survey($data)
    {
        $data = $this->prepare_data($data);
        $survey = $this->get_raw_survey();
        if (isset($survey['survey_generated_id']) && isset($data['survey_generated_id']) && $data['survey_generated_id'] == $survey['survey_generated_id']) {
            if (isset($data['trigger_type'])) {
                if ($data['trigger_type'] == actionTriggerTypes_started) {
                    return $this->user_input->save_data(transactionBy_by_user, $data['survey_generated_id'], $data);
                } else {
                    return $this->user_input->save_data(transactionBy_by_user, $data['survey_generated_id'], $data, array(
                        "response_id" => $data['response_id']
                    ));
                }
            }
        }
        return '';
    }

    /**
     * Check if the survey is active
     * @return boolean
     * true if it is active, false if it is not active
     */
    public function is_survey_active()
    {
        if ($this->start_time == $this->end_time) {
            // survey is always active
            return true;
        } else {
            if (strtotime($this->start_time) <= strtotime("now") && strtotime("now") <= strtotime($this->end_time)) {
                // The survey is active
                return true;
            } elseif (strtotime($this->start_time) > strtotime($this->end_time)) {
                // Handle the case where the end time is on the next day
                if (strtotime($this->start_time) <= strtotime("now") || strtotime("now") <= strtotime($this->end_time)) {
                    // The survey is active
                    return true;
                }
            } else {
                // Survey is not active right now
                return false;
            }
        }
        return false;
    }

    /**
     * Check if the survey is done; if once_per_schedule is not enabled it will return always false
     * @return boolean
     * true if it is active, false if it is not active
     */
    public function is_survey_done()
    {
        if ($this->once_per_user) {
            // the survey can be filled only once per user
            return $this->is_survey_done_by_user();
        } else if ($this->once_per_schedule) {
            // the survey can be filled once per schedule
            return $this->is_survey_done_by_user_for_schedule();
        } else {
            // survey can be filled as many times per schedule
            return false;
        }
    }

    /**
     * Saves uploaded files to the server.
     *
     * This function takes care of saving uploaded files to the server while organizing them
     * into appropriate directories based on survey, response, user code, and question name.
     *
     * @return mixed If all files are successfully saved, it returns an empty array. If there are any errors,
     *               it returns an associative array where keys are file names and values are the paths
     *               where the files were supposed to be saved but couldn't due to errors. If there are no errors
     *               and no files to be saved, it returns `null`.
     */
    public function save_uploaded_files()
    {
        $survey = $this->get_raw_survey();
        $survey_id = $survey['survey_generated_id'];
        $user_code = isset($_SESSION['user_code']) ? $_SESSION['user_code'] : 'no_code';
        $return_files = array();

        foreach ($_FILES as $index => $file) {
            $question_name = $_POST['question_name'];
            $response_id = $_POST['response_id'];
            $rel_path = SURVEYJS_UPLOAD_FOLDER . '/' . $survey_id . '/' . $response_id . '/' . $user_code . '/' . $question_name;
            $new_directory = __DIR__ . '/../../../../' . $rel_path;
            $new_file_name = '[' . $survey_id . '][' . $response_id . '][' . $user_code . '][' . $question_name . ']' . $file['name'];
            $new_file_name_full_path = $new_directory . '/' . $new_file_name;
            $new_file_name_full_path = str_replace(array("\r", "\n"), '', $new_file_name_full_path);
            $new_directory = str_replace(array("\r", "\n"), '', $new_directory);
            $rel_path = str_replace(array("\r", "\n"), '', $rel_path);
            $new_file_name = str_replace(array("\r", "\n"), '', $new_file_name);


            // Create the directory if it doesn't exist
            if (!is_dir($new_directory)) {
                if (!mkdir($new_directory, 0755, true)) {
                    // Handle the error (e.g., log or display an error message)
                    return false;
                }
            }

            if (!move_uploaded_file($file['tmp_name'], $new_file_name_full_path)) {
                return false;
            } else {
                $return_files[$file['name']] = '?file_path=' . $rel_path . '/' . $new_file_name;
            }
        }
        return $return_files;
    }

    /**
     * Load the last response for the survey in edit mode.
     * 
     * @param int $id_dataTables The ID of the data table.
     * 
     * @return array|false The last response data or false if no response is found.
     */
    private function load_response_survey_edit_mode($id_dataTables)
    {
        $own_entries_only = true;
        if ($id_dataTables && isset($this->entry_record['record_id'])) {
            $last_response = $this->user_input->get_data($id_dataTables, 'AND record_id  = ' . $this->entry_record['record_id'], $own_entries_only, $_SESSION['id_user'], true);
        }
        if (isset($last_response['_json'])) {
            return json_decode($last_response['_json'], true);
        }
        return false;
    }
}
?>
