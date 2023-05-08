<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../component/BaseView.php";
require_once __DIR__ . "/../../../../../component/style/BaseStyleComponent.php";

/**
 * The view class of the asset select component.
 */
class ModuleSurveyJSVersionsView extends BaseView
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
    private $survey_versions;

    /**
     * The constructor.
     *
     * @param object $model
     *  The model instance of the component.
     */
    public function __construct($model, $controller, $sid)
    {
        parent::__construct($model, $controller);
        $this->sid = $sid;
        if ($this->sid) {
            // $this->survey_versions = $this->model->get_survey_versions($this->sid);
        }
    }

    /* Private Methods ********************************************************/

    /* Public Methods *********************************************************/

    /**
     * Render the footer view.
     */
    public function output_content()
    {
        return require  __DIR__ . "/tpl_moduleSurveyJSVersions.php";
    }

    public function output_content_mobile()
    {
        echo 'mobile';
    }

    /**
     * Get js include files required for this component. This overrides the
     * parent implementation.
     *
     * @return array
     *  An array of js include files the component requires.
     */
    public function get_js_includes($local = array())
    {
        if (empty($local)) {
            $local = array(
                // __DIR__ . "/../moduleSurveyJS/js/1_knockout-latest.js",
                // __DIR__ . "/../moduleSurveyJS/js/2_survey.core.min.js",
                // __DIR__ . "/js/plotly-latest.min.js",
                // __DIR__ . "/js/wordcloud2.js",
                // __DIR__ . "/js/survey.analytics.min.js",
                // __DIR__ . "/js/xlsx.full.min.js",
                // __DIR__ . "/js/jspdf.min.js",
                // __DIR__ . "/js/jspdf.plugin.autotable.min.js",
                // __DIR__ . "/js/tabulator.min.js",
                // __DIR__ . "/js/survey.analytics.tabulator.min.js",
                // __DIR__ . "/js/dashboard.js",
            );
        }
        return parent::get_js_includes($local);
    }

    /**
     * Get css include files required for this component. This overrides the
     * parent implementation.
     *
     * @return array
     *  An array of css include files the component requires.
     */
    public function get_css_includes($local = array())
    {
        if (empty($local)) {
            $local = array(
                // __DIR__ . "/css/survey.analytics.min.css",
                // __DIR__ . "/css/tabulator.min.css",
                // __DIR__ . "/css/survey.analytics.tabulator.css",
                // __DIR__ . "/css/dashboard.css"
            );
        }
        return parent::get_css_includes($local);
    }
}
?>
