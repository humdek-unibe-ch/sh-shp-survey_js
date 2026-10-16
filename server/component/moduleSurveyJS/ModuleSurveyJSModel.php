<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../component/BaseModel.php";
/**
 * This class is used to prepare all data related to the cmsPreference component such
 * that the data can easily be displayed in the view of the component.
 */
class ModuleSurveyJSModel extends BaseModel
{

    /* Constructors ***********************************************************/
    /**
     * Survey id, 
     * if it is > 0  edit/delete survey page     
     */
    private $sid;

    /**
     * the current selected survey
     */
    private $survey;

    /**
     * The constructor.
     *
     * @param object $services
     *  An associative array holding the different available services. See the
     *  class definition BasePage for a list of all services.
     */
    public function __construct($services, $sid)
    {
        parent::__construct($services);
        $this->sid = $sid;
        $this->survey = $this->fetch_survey($sid);
    }

    /**
     * Insert a new SurveyJS.     
     * @return int
     *  The id of the new survey or false if the process failed.
     */
    public function insert_new_survey()
    {
        try {
            $this->db->begin_transaction();
            $sid = $this->db->insert(SURVEYJS_TABLE_SURVEYS, array(
                "survey_generated_id" => "SVJS_" . substr(uniqid(), -15)
            ));
            $this->transaction->add_transaction(
                transactionTypes_insert,
                transactionBy_by_user,
                $_SESSION['id_user'],
                SURVEYJS_TABLE_SURVEYS,
                $sid
            );
            $this->db->commit();
            $this->db->clear_cache($this->db->get_cache()::CACHE_TYPE_SECTIONS);
            return $sid;
        } catch (Exception $e) {
            $this->db->rollback();
            return false;
        }
    }

    /**
     * Update a SurveyJS.   
     * @param int $sid
     * Survey id,
     * @param object $surveyJson
     * Survey json data
     * @return int
     *  The id of the new survey or false if the process failed.
     */
    public function update_survey($sid, $surveyJson)
    {
        if (!is_array($surveyJson)) {
            return false;
        }
        try {
            $this->db->begin_transaction();
            $this->db->update_by_ids(SURVEYJS_TABLE_SURVEYS, array("config" => json_encode($surveyJson)), array('id' => $sid));
            $this->transaction->add_transaction(
                transactionTypes_update,
                transactionBy_by_user,
                $_SESSION['id_user'],
                SURVEYJS_TABLE_SURVEYS,
                $sid
            );
            $displayName = $this->survey_display_name_from_json($surveyJson);
            // Only create/rename the response dataTable once we have a real title.
            // Failed or empty JSON pastes must not leave empty dataTables behind.
            if ($displayName !== '') {
                $this->sync_survey_dataTable_name($displayName);
            }
            $this->db->commit();
            $this->db->clear_cache($this->db->get_cache()::CACHE_TYPE_SECTIONS);
            return $sid;
        } catch (Exception $e) {
            $this->db->rollback();
            return false;
        }
    }

    /**
     * Human-readable survey title from Creator JSON, or '' when missing.
     *
     * @param array $surveyJson
     * @return string
     */
    private function survey_display_name_from_json($surveyJson)
    {
        if (!isset($surveyJson['title'])) {
            return '';
        }
        $title = $surveyJson['title'];
        if (is_array($title)) {
            $title = isset($title['default']) ? $title['default'] : '';
        }
        return is_string($title) ? trim($title) : '';
    }

    /**
     * Ensure one dataTable for this survey_generated_id; update displayName if it exists.
     *
     * @param string $displayName
     * @return void
     */
    private function sync_survey_dataTable_name($displayName)
    {
        if (!isset($this->survey['survey_generated_id']) || $this->survey['survey_generated_id'] === '') {
            return;
        }
        $name = $this->survey['survey_generated_id'];
        $id_table = $this->user_input->get_dataTable_id($name);
        if ($id_table) {
            $this->db->update_by_ids('dataTables', array('displayName' => $displayName), array('id' => $id_table));
            return;
        }
        $this->set_dataTables_displayName($name, $displayName);
    }

    /**
     * Fetch survey
     * @param int $sid
     * survey id
     * @return object
     * Return the survey row
     */
    public function fetch_survey($sid)
    {
        $sql = "SELECT *, IFNULL(
                    JSON_UNQUOTE(JSON_EXTRACT(config, '$.title.default')), 
                    JSON_UNQUOTE(JSON_EXTRACT(config, '$.title'))
                ) AS survey_name
                FROM surveys
                WHERE id = :id";
        return $this->db->query_db_first($sql, array(':id' => $sid));
    }

    /**
     * Get all surveys
     * @return array
     * Return all surveys as rows
     */
    public function get_surveys()
    {
        // Only the columns the listing renders. view_surveys also exposes the
        // full survey `config`, which the list never reads (#3).
        $sql = "SELECT id, survey_generated_id, survey_name, created_at, updated_at, published, published_at
                FROM view_surveys";
        return $this->db->query_db($sql);
    }

    /**
     * Delete survey
     * @param int $sid
     * The survey id
     * @return bool
     * Return the success result of the operation
     */
    public function delete_survey($sid)
    {
        return $this->db->remove_by_ids("surveys", array("id" => $sid));
    }

    /**
     * Publish survey
     * @param int $sid
     * The survey id
     * @return bool
     * Return the success result of the operation
     */
    public function publish_survey($sid)
    {
        $sql = 'UPDATE surveys
                SET published = config, published_at = NOW()
                WHERE id =:sid;';
        $res = $this->db->execute_update_db($sql, array(":sid" => $sid));
        if ($res) {
            // add new version of the survey
            $survey = $this->fetch_survey($sid);

            $res = $res &&  $this->db->insert(SURVEYJS_TABLE_SURVEYS_VERSIONS, array(
                "id_users" => $_SESSION['id_user'],
                "id_surveys" => $sid,
                "config" => $survey['published'],
                "published" => 1
            ));
        }
        return $res;
    }

    /**
     * Get the survey data
     * @return object
     * Return the survey
     */
    public function get_survey()
    {
        return $this->survey;
    }
}
