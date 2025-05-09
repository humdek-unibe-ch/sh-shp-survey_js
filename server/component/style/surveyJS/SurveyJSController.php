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
        $router = $model->get_services()->get_router();
        if(is_array($router->route['params']) && isset($router->route['params']['data'])){
            return $model->return_data($router->route['params']['data']);
        }
        if (isset($_POST['trigger_type'])) {
            // survey data is sent
            $data = array_merge([], $_POST); //create a copy
            unset($data['id_languages']);
            unset($data['device_id']);
            unset($data['device_token']);
            $res = $this->model->save_survey($data);
            if ($res !== '') {
                // check if there is a result from this survey request
                header("Content-Type: application/json");
                echo json_encode(array("result" => $res));
                uopz_allow_exit(true);
                exit();
            }
        } else if (isset($_POST['upload_files']) && isset($_FILES) && isset($_POST['response_id']) && isset($_POST['question_name'])) {
            $files = $this->model->save_uploaded_files();
            header("Content-Type: application/json");
            if ($files) {
                echo json_encode($files, JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(array("status" => "error", "error" => "Error while saving the files!"), JSON_UNESCAPED_UNICODE);
            };
            uopz_allow_exit(true);
            exit();
        }
    }

    /* Private Methods ********************************************************/
}
?>
