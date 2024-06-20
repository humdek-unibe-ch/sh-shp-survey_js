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
            if (!isset($surveyJson['title'])) {
                $displayName = '';
            } else {
                $displayName = is_array($surveyJson['title']) ? $surveyJson['title']['default'] : $surveyJson['title'];
            }
            $this->set_dataTables_displayName($this->survey['survey_generated_id'], $displayName);
            $this->db->commit();
            return $sid;
        } catch (Exception $e) {
            $this->db->rollback();
            return false;
        }
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
        return $this->db->select_table("view_surveys");
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
