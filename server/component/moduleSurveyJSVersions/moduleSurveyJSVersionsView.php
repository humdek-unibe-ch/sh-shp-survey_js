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
     * All versions for the selected survey
     */
    private $survey_versions;

    /**
     * the current selected survey
     */
    private $survey;

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
            $this->survey_versions = $this->model->get_survey_versions($this->sid);
            $this->survey = $this->model->get_survey($this->sid);
        }
    }

    /* Private Methods ********************************************************/

    /* Public Methods *********************************************************/

    /**
     * Render the footer view.
     */
    public function output_content()
    {
        if ($this->survey) {
            return require  __DIR__ . "/tpl_moduleSurveyJSVersions.php";
        }
    }

    public function output_content_mobile()
    {
        echo 'mobile';
    }

    /**
     * Render the rows for the survey js versions
     */
    protected function output_actions_rows()
    {
        foreach ($this->survey_versions as $version) {
            require __DIR__ . "/tpl_surveyJSVersions_row.php";
        }
    }

    /**
     * Render the sidebar buttons
     */
    public function output_side_buttons()
    {
        //show create button
        $createButton = new BaseStyleComponent("button", array(
            "label" => "Back to Survey Editor",
            "id" => 'survey-js-back',
            "url" => $this->model->get_link_url("moduleSurveyJSMode", array("mode" => UPDATE, "sid" => $this->sid)),
            "type" => "secondary",
            "css" => "d-block mb-3",
        ));
        $createButton->output_content();
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
                __DIR__ . "/js/surveyVersions.js",
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
