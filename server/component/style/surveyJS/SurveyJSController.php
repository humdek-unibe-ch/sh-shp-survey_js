<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../../component/BaseController.php";
/**
 * The controller class of formUserInput style component.
 */
class SurveyJSController extends BaseController
{
    /* Private Properties *****************************************************/



    /* Constructors ***********************************************************/

    /**
     * The constructor.
     *
     * @param object $model
     *  The model instance of the login component.
     */
    public function __construct($model)
    {
        parent::__construct($model);
        if (isset($_POST['trigger_type'])) {
            // survey data is sent
            $data = array_merge([], $_POST); //create a copy
            unset($data['id_languages']);
            unset($data['device_id']);
            unset($data['device_token']);
            $this->model->save_survey($data);
        } else if (isset($_POST['upload_files']) && isset($_FILES) && isset($_POST['response_id']) && isset($_POST['question_name'])) {
            $files = $this->model->save_uploaded_files();
            if ($files) {
                echo json_encode($files, JSON_UNESCAPED_UNICODE);
                exit;
            } else {
                echo json_encode(array("status" => "error", "error" => "Error while saving the files!"), JSON_UNESCAPED_UNICODE);
                exit;
            };
        }
    }

    /* Private Methods ********************************************************/
}
?>
