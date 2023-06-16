<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../component/BaseComponent.php";
require_once __DIR__ . "/ModuleSurveyJSVersionsView.php";
require_once __DIR__ . "/ModuleSurveyJSVersionsModel.php";
require_once __DIR__ . "/ModuleSurveyJSVersionsController.php";

/**
 * The class to define the asset select component.
 */
class ModuleSurveyJSVersionsComponent extends BaseComponent
{
    /* Constructors ***********************************************************/

    /**
     * The constructor creates an instance of the Model class and the View
     * class and passes them to the constructor of the parent class.
     *
     * @param array $services
     *  An associative array holding the different available services. See the
     *  class definition BasePage for a list of all services.
     * @param number $id_page
     *  The parent page id
     */
    public function __construct($services, $params)
    {
        $sid = isset($params['sid']) ? intval($params['sid']) : null;
        $model = new ModuleSurveyJSVersionsModel($services);
        $controller = new ModuleSurveyJSVersionsController($model, $sid);
        $view = new ModuleSurveyJSVersionsView($model, $controller, $sid);
        parent::__construct($model, $view, $controller);
    }
}
?>
