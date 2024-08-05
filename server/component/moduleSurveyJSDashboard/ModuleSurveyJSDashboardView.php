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
            $this->survey = $this->model->get_survey();
        }
    }

    /* Private Methods ********************************************************/

    /* Public Methods *********************************************************/

    /**
     * Render the footer view.
     */
    public function output_content()
    {
        // return require  __DIR__ . "/tpl_moduleSurveyJSDashboard.php";
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
                                    "url" => $this->model->get_link_url(PAGE_SURVEY_JS_MODE, array("mode" => UPDATE, "sid" => $this->sid)),
                                    "type" => "secondary",
                                )),
                                new BaseStyleComponent("button", array(
                                    "label" => "Refresh",
                                    "css" => "ml-3",
                                    "url" => "#",
                                    "id" => "refresh_dashboard",
                                    "type" => "primary",
                                ))
                            )
                        )),
                        new BaseStyleComponent("button", array(
                            "label" => "Reset Dashboard",
                            "id" => "reset_dashboard",
                            "url" => "#",
                            "type" => "danger",
                        ))
                    )
                )),
                new BaseStyleComponent("card", array(
                    "css" => "survey-js-card",
                    "is_expanded" => true,
                    "is_collapsible" => false,
                    "type" => "warning",
                    "id" => "survey-js-dashboard-card",
                    "title" => '<span>Survey JS Dashboard</span>' . (isset($this->survey['survey_name']) ? ('<div> <code>&nbsp;' . $this->survey['survey_name'] . '</code></div>') : '') . (isset($this->survey['survey_generated_id']) ? ('<div> <code>&nbsp;' . $this->survey['survey_generated_id'] . '</code></div>') : ''),
                    "children" => array(new BaseStyleComponent("template", array(
                        "path" => __DIR__ . "/tpl_moduleSurveyJSDashboard.php",
                        "items" => array(
                            "survey" => $this->survey,
                            "output_dashboard_panel" => function () {
                                require __DIR__ . "/tpl_moduleSurveyJSDashboardPanel.php";
                            },
                            "output_dashboard_table" => function () {
                                require __DIR__ . "/tpl_moduleSurveyJSTable.php";
                            }
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
            $local = array(
                __DIR__ . "/../moduleSurveyJS/js/1_knockout-latest.js",
                __DIR__ . "/../moduleSurveyJS/js/2_survey.core.min.js",
                __DIR__ . "/../moduleSurveyJS/js/7_surveyjs-widgets.min.js",
                __DIR__ . "/js/plotly-latest.min.js",
                __DIR__ . "/js/wordcloud2.js",
                __DIR__ . "/js/survey.analytics.min.js",
                __DIR__ . "/js/xlsx.full.min.js",
                __DIR__ . "/js/jspdf.min.js",
                __DIR__ . "/js/jspdf.plugin.autotable.min.js",
                __DIR__ . "/js/tabulator.min.js",
                __DIR__ . "/js/survey.analytics.tabulator.min.js",
                __DIR__ . "/js/dashboard.js",
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
                __DIR__ . "/css/survey.analytics.min.css",
                __DIR__ . "/css/tabulator.min.css",
                __DIR__ . "/css/survey.analytics.tabulator.css",
                __DIR__ . "/css/dashboard.css"
            );
        }
        return parent::get_css_includes($local);
    }
}
?>
