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
class ModuleSurveyJSVersionsModel extends ModuleSurveyJSModel
{

    /* Constructors ***********************************************************/

    /**
     * The constructor.
     *
     * @param array $services
     *  An associative array holding the different available services. See the
     *  class definition BasePage for a list of all services.
     */
    public function __construct($services, $sid)
    {
        parent::__construct($services, $sid);
    }

    /**
     * Get survey js versions
     * @param int $sid
     * survey id
     * @param return object
     * Return the survey versions
     */
    public function get_survey_versions($sid)
    {
        $sql = "SELECT sv.*, u.email AS user_email
                FROM surveys_versions sv
                INNER JOIN users u ON (sv.id_users = u.id)
                WHERE sv.id_surveys = :sid";
        return $this->db->query_db($sql, array(':sid' => $sid));
    }

    /**
     * Restore survey to the selected version
     * @param int $sid
     * The survey id that we want to restore
     * @param int $version_id 
     * The version id that we want to restore
     * @return bool
     * Return the result of the action
     */
    public function restore_survey($sid, $version_id)
    {
        try {
            $this->db->begin_transaction();
            $sql = 'UPDATE surveys
                SET config = (SELECT config FROM surveys_versions WHERE id = :vid LIMIT 0,1)
                WHERE id = :sid;';
            $res = $this->db->execute_update_db($sql, array(
                ":sid" => $sid,
                ":vid" => $version_id
            ));
            $sql = 'UPDATE surveys_versions
                    SET restored_at = NOW()
                    WHERE id = :vid;';
            $res = $res && $this->db->execute_update_db($sql, array(
                ":vid" => $version_id
            ));
            $this->db->commit();
            return $res;
        } catch (Exception $e) {
            $this->db->rollback();
            return false;
        }
    }
}
