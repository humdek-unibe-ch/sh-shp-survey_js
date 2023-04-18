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
            $surveyJSHolder = new BaseStyleComponent("div", array(
                "css" => "m-3",
                "children" => array(
                    new   BaseStyleComponent("div", array(
                        "css" => "mb-3 d-flex justify-content-between",
                        "children" => array(
                            new BaseStyleComponent("button", array(
                                "label" => "Back to All Surveys",
                                "url" => $this->model->get_link_url("moduleSurveyJS"),
                                "type" => "secondary",
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
                        "title" => 'Survey JS',
                        "children" => array(new BaseStyleComponent("template", array(
                            "path" => __DIR__ . "/tpl_moduleSurveyCreatorJS.php",
                            "items" => array(
                                "survey" => $this->survey
                            )
                        )))
                    ))
                )
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
                __DIR__ . "/js/survey.js",
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
                    __DIR__ . "/css/modern.min.css",
                    __DIR__ . "/css/defaultV2.min.css",
                    __DIR__ . "/css/survey-creator-core.min.css",
                    __DIR__ . "/css/survey.css"
                );
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
