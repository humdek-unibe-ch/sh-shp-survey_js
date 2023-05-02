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
class ModuleSurveyJSDashboardView extends BaseView
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
        $surveyJSHolder = new BaseStyleComponent("div", array(
            "css" => "m-3",
            "children" => array(
                new   BaseStyleComponent("div", array(
                    "css" => "mb-3 d-flex justify-content-between",
                    "children" => array(
                        new   BaseStyleComponent("div", array(
                            "css" => "",
                            "children" => array(
                                new BaseStyleComponent("button", array(
                                    "label" => "Back to Survey Editor",
                                    "url" => $this->model->get_link_url("moduleSurveyJSMode", array("mode" => UPDATE, "sid" => $this->sid)),
                                    "type" => "secondary",
                                ))
                            )
                        ))
                    )
                )),
                new BaseStyleComponent("card", array(
                    "css" => "survey-js-card",
                    "is_expanded" => true,
                    "is_collapsible" => false,
                    "type" => "warning",
                    "id" => "survey-js-dashboard-card",
                    "title" => 'Survey JS Dashboard',
                    "children" => array(new BaseStyleComponent("template", array(
                        "path" => __DIR__ . "/tpl_moduleSurveyJSDashboard.php",
                        "items" => array(
                            "survey" => $this->survey
                        )
                    )))
                ))
            )
        ));

        $surveyJSHolder->output_content();
    }

    public function output_content_mobile()
    {
        echo 'mobile';
    }

    /**
     * Render the alert message.
     */
    protected function output_alert()
    {
        $this->output_controller_alerts_fail();
        $this->output_controller_alerts_success();
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
            if (DEBUG) {
                $local = array(
                    __DIR__ . "/../moduleSurveyJS/js/1_knockout-latest.js",
                    __DIR__ . "/../moduleSurveyJS//js/2_survey.core.min.js",
                    __DIR__ . "/js/01_plotly-latest.min.js",
                    __DIR__ . "/js/02_wordcloud2.js",
                    __DIR__ . "/js/03_survey.analytics.min.js",
                    __DIR__ . "/js/04_dashboard.js",
                );
            } else {
                $local = array(__DIR__ . "/../../../../survey-js/js/ext/survey-js.min.js?v=" . rtrim(shell_exec("git describe --tags")));
            }
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
            if (DEBUG) {
                $local = array(
                    __DIR__ . "/css/survey.analytics.min.css"
                );
            } else {
                $local = array(__DIR__ . "/../../../../survey-js/css/ext/survey-js.min.css?v=" . rtrim(shell_exec("git describe --tags")));
            }
        }
        return parent::get_css_includes($local);
    }
}
?>
