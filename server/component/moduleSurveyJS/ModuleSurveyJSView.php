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
class ModuleSurveyJSView extends BaseView
{
    /* Constructors ***********************************************************/

    /**
     * Survey id, 
     * if it is > 0  edit/delete survey page     
     */
    private $sid;

    /**
     * The mode type of the form EDIT, DELETE, INSERT, VIEW     
     */
    private $mode;

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
    public function __construct($model, $controller, $mode, $sid)
    {
        parent::__construct($model, $controller);
        $this->mode = $mode;
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
        if (!$this->mode) {
            require __DIR__ . "/tpl_moduleSurveyJS.php";
        } else {
            require __DIR__ . "/tpl_moduleSurveyJS_Alerts.php";
            $card_title = '<span>Survey JS </span>'  . (isset($this->survey['survey_generated_id']) ? ('<div> <code>&nbsp;' . $this->survey['survey_generated_id'] . '</code></div>') : '');
            if ($this->survey['published']) {
                $card_title = $card_title . '<span class="text-right flex-grow-1">Published at: <code id="survey-js-publish-at">' . $this->survey['published_at'] . '</code> </span>';
            } else {
                $card_title = $card_title . '<span class="text-right flex-grow-1"><code>Not published yet</code> </span>';
            }            
            $surveyJSHolderChildren = array(
                $this->output_check_multiple_users(true),
                new   BaseStyleComponent("div", array(
                    "css" => "mb-3 d-flex justify-content-between",
                    "children" => array(
                        new   BaseStyleComponent("div", array(
                            "css" => "",
                            "children" => array(
                                new BaseStyleComponent("button", array(
                                    "label" => "Back to All Surveys",
                                    "url" => $this->model->get_link_url("moduleSurveyJS"),
                                    "type" => "secondary",
                                )),
                                new BaseStyleComponent("button", array(
                                    "label" => "Publish",
                                    "id" => "survey-js-publish",
                                    "url" => "#",
                                    "type" => "warning",
                                    "css" => "ml-3 " . ($this->survey['config'] == $this->survey['published'] ? 'disabled' : '')
                                )),
                                new BaseStyleComponent("button", array(
                                    "label" => "Dashboard",
                                    "url" => $this->model->get_link_url("moduleSurveyJSDashboard", array("sid" => $this->sid)),
                                    "type" => "primary",
                                    "css" => "ml-3"
                                ))
                            )
                        )),
                        new BaseStyleComponent("button", array(
                            "label" => "Delete Survey",
                            "id" => "survey-js-delete-btn",
                            "url" => $this->model->get_link_url("moduleSurveyJSMode", array("mode" => DELETE, "sid" => $this->sid)),
                            "type" => "danger",
                        ))
                    )
                )),
                new BaseStyleComponent("card", array(
                    "css" => "survey-js-card",
                    "is_expanded" => true,
                    "is_collapsible" => false,
                    "type" => "warning",
                    "id" => "survey-js-card",
                    "title" => $card_title,
                    "children" => array(new BaseStyleComponent("template", array(
                        "path" => __DIR__ . "/tpl_moduleSurveyCreatorJS.php",
                        "items" => array(
                            "survey" => $this->survey
                        )
                    )))
                ))
            );
            $surveyJSHolder = new BaseStyleComponent("div", array(
                "css" => "m-3",
                "children" => $surveyJSHolderChildren
            ));

            $surveyJSHolder->output_content();
        }
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
                __DIR__ . "/js/1_knockout-latest.js",
                __DIR__ . "/js/2_survey.core.min.js",
                __DIR__ . "/js/3_survey-knockout-ui.min.js",
                __DIR__ . "/js/4_survey-creator-core.min.js",
                __DIR__ . "/js/5_survey-creator-knockout.min.js",
                __DIR__ . "/js/6_survey-creator-core.i18n.min",
                __DIR__ . "/js/7_survey.i18n.min",
                __DIR__ . "/js/8_survey.js",
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
            if (DEBUG) {
                $local = array(
                    __DIR__ . "/css/survey.min.css",
                    __DIR__ . "/../style/surveyJS/css/modern.min.css",
                    __DIR__ . "/../style/surveyJS/css/defaultV2.min.css",
                    __DIR__ . "/css/survey-creator-core.min.css",
                    __DIR__ . "/css/survey.css"
                );
            } else {
                $local = array(__DIR__ . "/../../../../survey-js/css/ext/survey-js.min.css?v=" . rtrim(shell_exec("git describe --tags")));
            }
        }
        return parent::get_css_includes($local);
    }

    /**
     * Render the sidebar buttons
     */
    public function output_side_buttons()
    {
        //show create button
        $createButton = new BaseStyleComponent("button", array(
            "label" => "Create New SurveyJS",
            "url" => $this->model->get_link_url("moduleSurveyJSMode", array("mode" => INSERT)),
            "type" => "secondary",
            "css" => "d-block mb-3",
        ));
        $createButton->output_content();
    }

    /**
     * render the page content
     */
    public function output_page_content()
    {
        require __DIR__ . "/tpl_moduleSurveyJS_table.php";
    }

    /**
     * Render the rows for the surveys
     */
    public function output_surveys_rows()
    {
        foreach ($this->model->get_surveys() as $survey) {
            require __DIR__ . "/tpl_moduleSurveyJS_row.php";
        }
    }
}
?>
