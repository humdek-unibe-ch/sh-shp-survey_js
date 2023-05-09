<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../moduleSurveyJS/ModuleSurveyJSController.php";
/**
 * The controller class of the group insert component.
 */
class ModuleSurveyJSVersionsController extends ModuleSurveyJSController
{
    /* Private Properties *****************************************************/


    /* Constructors ***********************************************************/

    /**
     * The constructor.
     *
     * @param object $model
     *  The model instance of the component.
     */
    public function __construct($model, $sid)
    {
        parent::__construct($model, SELECT, $sid);
        if (!$this->check_acl(UPDATE)) {
            return false;
        }
        if (isset($_POST['mode']) && $_POST['mode'] == 'restore' && isset($_POST['version_id'])) {
            $res = $this->model->restore_survey($sid, $_POST['version_id']);
            echo json_encode(array("result" => $res));
            exit();
        }
    }

    /* Public Methods *********************************************************/
}
?>
