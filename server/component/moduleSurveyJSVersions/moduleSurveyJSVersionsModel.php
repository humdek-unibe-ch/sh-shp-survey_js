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
    public function __construct($services)
    {
        parent::__construct($services);
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

    
}
