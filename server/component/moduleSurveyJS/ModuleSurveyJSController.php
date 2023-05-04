<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../component/BaseController.php";
/**
 * The controller class of the group insert component.
 */
class ModuleSurveyJSController extends BaseController
{
    /* Private Properties *****************************************************/


    /* Constructors ***********************************************************/

    /**
     * The constructor.
     *
     * @param object $model
     *  The model instance of the component.
     */
    public function __construct($model, $mode, $sid)
    {
        parent::__construct($model);
        if (isset($mode) && !$this->check_acl($mode)) {
            return false;
        }
        if ($mode === INSERT) {
            //insert mode
            $sid = $this->model->insert_new_survey();
            if ($sid) {
                // redirect in update mode with the newly created survey id
                $url = $this->model->get_link_url("moduleSurveyJSMode", array("mode" => UPDATE, "sid" => $sid));
                header('Location: ' . $url);
            }
        } else if ($mode === UPDATE && $sid > 0 && isset($_POST['surveyJson'])) {
            $this->model->update_survey($sid, $_POST['surveyJson']);
        } else if ($mode === UPDATE && $sid > 0 && isset($_POST['mode']) && $_POST['mode'] == 'publish') {
            $this->model->publish_survey($sid);
        } else if ($mode === DELETE && $sid > 0) {
            $del_res = $this->model->delete_survey($sid);
            if ($del_res) {
                header('Location: ' . $this->model->get_link_url("moduleSurveyJS"));
            } else {
                $this->fail = true;
                $this->error_msgs[] = "Failed to delete survey: " . $sid;
            }
        }
    }

    /**
     * Check the acl for the current user and the current page
     * @return bool
     * true if access is granted, false otherwise.
     */
    private function check_acl($mode)
    {
        if (!$this->model->get_services()->get_acl()->has_access($_SESSION['id_user'], $this->model->get_services()->get_db()->fetch_page_id_by_keyword("moduleSurveyJSMode"), $mode)) {
            $this->fail = true;
            $this->error_msgs[] = "You don't have rights to " . $mode . " this survey";
            return false;
        } else {
            return true;
        }
    }

    /* Public Methods *********************************************************/
}
?>
