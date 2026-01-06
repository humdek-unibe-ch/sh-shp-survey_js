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

    /**
     * Recursively converts string values of "true" and "false" to boolean true and false within a nested array.
     *
     * This function traverses through a given array and checks each value. If a value is a nested array,
     * it recursively processes that array. If a value is the string "true" or "false", it converts that
     * value to the corresponding boolean true or false.
     *
     * @param array $data The input array that may contain string "true" and "false" values.
     * @return array The processed array with "true" and "false" strings converted to boolean true and false.
     */
    private function convertStringToBoolean($data) {
        if (is_array($data)) {
            foreach ($data as $key => &$value) {
                if (is_array($value)) {
                    $value = $this->convertStringToBoolean($value); // Recursive call for nested arrays
                } elseif ($value === "true") {
                    $value = true;
                } elseif ($value === "false") {
                    $value = false;
                }
            }
        }
        return $data;
    }

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

        // Handle AJAX survey update requests regardless of mode
        if (isset($_POST['surveyJson'])) {
            error_log("SurveyJson POST detected, X-Requested-With: " . ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? 'not set'));
            error_log("Buffer levels before clearing: " . ob_get_level());

            if (!$this->check_acl(UPDATE)) {
                error_log("ACL check failed, outputting auth error JSON");
                // Clear all output buffers
                while (ob_get_level()) {
                    ob_end_clean();
                }
                header('Content-Type: application/json');
                echo json_encode(array('success' => false, 'error' => 'Authentication required', 'message' => 'Your session has expired. Please log in again.'));
                error_log("About to flush and die for auth error");
                flush();
                die('AUTH_EXIT');
            }

            $adjustJson = $this->convertStringToBoolean(json_decode($_POST['surveyJson'], true)); // convert all booleans from string to bool
            $result = $this->model->update_survey($sid, $adjustJson);

            if ($result !== false) {
                error_log("Update successful, outputting success JSON");
                // Clear all output buffers
                while (ob_get_level()) {
                    ob_end_clean();
                }
                header('Content-Type: application/json');
                echo json_encode(array('success' => true, 'sid' => $result));
                error_log("About to flush and die for success");
                flush();
                die('SUCCESS_EXIT');
            } else {
                error_log("Update failed, outputting error JSON");
                // Clear all output buffers
                while (ob_get_level()) {
                    ob_end_clean();
                }
                header('Content-Type: application/json');
                echo json_encode(array('success' => false, 'error' => 'Failed to update survey'));
                error_log("About to flush and die for failure");
                flush();
                die('FAILURE_EXIT');
            }
        }

        if (isset($mode) && !$this->check_acl($mode)) {
            // Send authentication error response for AJAX requests
            if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
                // Clear all output buffers
                while (ob_get_level()) {
                    ob_end_clean();
                }
                header('Content-Type: application/json');
                echo json_encode(array('success' => false, 'error' => 'Authentication required', 'message' => 'Your session has expired. Please log in again.'));
                flush();
                die();
            }
            return false;
        }
        if ($mode === INSERT) {
            //insert mode
            $sid = $this->model->insert_new_survey();
            if ($sid) {
                // redirect in update mode with the newly created survey id
                $url = $this->model->get_link_url(PAGE_SURVEY_JS_MODE, array("mode" => UPDATE, "sid" => $sid));
                header('Location: ' . $url);
            }
        } else if ($mode === UPDATE && $sid > 0 && isset($_POST['mode']) && $_POST['mode'] == 'publish') {
            $result = $this->model->publish_survey($sid);
            if ($result) {
                // Clear all output buffers
                while (ob_get_level()) {
                    ob_end_clean();
                }
                header('Content-Type: application/json');
                echo json_encode(array('success' => true, 'sid' => $sid));
                flush();
                die();
            } else {
                // Clear all output buffers
                while (ob_get_level()) {
                    ob_end_clean();
                }
                header('Content-Type: application/json');
                echo json_encode(array('success' => false, 'error' => 'Failed to publish survey'));
                flush();
                die();
            }
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
    protected function check_acl($mode)
    {
        if (!$this->model->get_services()->get_acl()->has_access($_SESSION['id_user'], $this->model->get_services()->get_db()->fetch_page_id_by_keyword(PAGE_SURVEY_JS_MODE), $mode)) {
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
