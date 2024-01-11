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
class ModuleSurveyJSDashboardController extends BaseController
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
        parent::__construct($model);
        if (isset($_GET['file_path'])) {
            $this->output_file();
        }
    }

    /**
     * Outputs a file for download.
     *
     * This method is responsible for sending a file for download to the client with appropriate headers
     * based on the file's MIME type. It also handles various file types such as PDF, ZIP, JPEG, JPG, and PNG.
     * If the file does not exist, it will provide an error message.
     */
    private function output_file()
    {
        $file_path = $_GET['file_path'];
        $absolute_path = __DIR__ . '../../../../' . $file_path;
        if (file_exists($absolute_path)) {
            // Set the appropriate headers for a download
            // get the file mime type using the file extension
            switch (strtolower(substr(strrchr($absolute_path, '.'), 1))) {
                case 'pdf':
                    $mime = 'application/pdf';
                    break;
                case 'zip':
                    $mime = 'application/zip';
                    break;
                case 'jpeg':
                case 'jpg':
                    $mime = 'image/jpg';
                    break;
                case 'png':
                    $mime = 'image/png';
                    break;
                default:
                    $mime = 'application/force-download';
            }
            ob_clean();
            header('Content-Description: File Transfer');
            header('Content-Type: ' . $mime);
            header('Content-Disposition: attachment; filename="' . basename($absolute_path) . '"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
            header('Cache-Control: private', false);
            header('Pragma: public');
            header('Content-Length: ' . filesize($absolute_path));

            // Read and output the file
            readfile($absolute_path);
            exit;
        } else {
            // File not found, you can handle this case accordingly (e.g., display an error message)
            echo "File not found!";
        }
    }

    /* Public Methods *********************************************************/
}
?>
