<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../../../component/style/StyleView.php";

/**
 * The view class of the formUserInput style component.
 */
class SurveyJSView extends StyleView
{
    /* Private Properties *****************************************************/

    /**
     * The survey id
     */
    private $sid;

    /**
     * The survey info
     */
    private $survey;

    /**
     * Markdown text that is shown if the survey is done and it can be filled only once per schedule.
     */
    private $label_survey_done;

    /**
     * Markdown text that is shown if the survey is not active right now.
     */
    private $label_survey_not_active;

    /**
     * If true the survey is restarted on refresh
     */
    private $restart_on_refresh;

    /**
     * If it is set it redirects to this link after the survey is completed
     */
    private $redirect_at_end;

    /* Constructors ***********************************************************/

    /**
     * The constructor.
     *
     * @param object $model
     *  The model instance of a base style component.
     * @param object $controller
     *  The controller instance of the component.
     */
    public function __construct($model, $controller)
    {
        parent::__construct($model, $controller);
        $this->sid = $this->model->get_db_field('survey-js', '');
        if ($this->sid > 0) {
            $this->survey = $this->model->get_survey();
        }
        $this->label_survey_done = $this->model->get_db_field('label_survey_done', '');
        $this->label_survey_not_active = $this->model->get_db_field('label_survey_not_active', '');
        $this->restart_on_refresh = $this->model->get_db_field('restart_on_refresh', '');
        $this->redirect_at_end = $this->model->get_db_field('redirect_at_end', '');
    }


    /* Public Methods *********************************************************/

    /**
     * Render the style view.
     */
    public function output_content()
    {
        if ($this->model->is_survey_active()) {
            if ($this->model->is_survey_done()) {
                if ($this->label_survey_done != '') {
                    $alert = new BaseStyleComponent("alert", array(
                        "type" => "danger",
                        "is_dismissable" => false,
                        "children" => array(new BaseStyleComponent("markdown", array(
                            "text_md" => $this->label_survey_done,
                        )))
                    ));
                    $alert->output_content();
                }
            } else {
                $redirect_at_end = preg_replace('/^\/+/', '', $this->redirect_at_end); // remove the first /
                $redirect_at_end = preg_replace('/^#+/', '', $this->redirect_at_end); // remove the first #
                $redirect_at_end = $this->model->get_link_url(str_replace("/", "", $redirect_at_end));
                $survey_fields = array(
                    "restart_on_refresh" => boolval($this->restart_on_refresh),
                    "redirect_at_end" => $redirect_at_end
                );
                $survey_fields = json_encode($survey_fields);
                require __DIR__ . "/tpl_surveyJS.php";
            }
        } else {
            if ($this->label_survey_not_active != '') {
                $alert = new BaseStyleComponent("alert", array(
                    "type" => "danger",
                    "is_dismissable" => false,
                    "children" => array(new BaseStyleComponent("markdown", array(
                        "text_md" => $this->label_survey_not_active,
                    )))
                ));
                $alert->output_content();
            }
        }
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
                    __DIR__ . "/js/1_survey.jquery.min.js",
                    __DIR__ . "/js/2_surveyJS.js"
                );
            } else {
                $local = array(__DIR__ . "/../../../../../survey-js/js/ext/survey-js.min.js?v=" . rtrim(shell_exec("git describe --tags")));
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
                    __DIR__ . "/css/modern.min.css",
                    __DIR__ . "/css/defaultV2.min.css",
                    __DIR__ . "/css/survey.css"
                );
            } else {
                $local = array(__DIR__ . "/../../../../../survey-js/css/ext/survey-js.min.css?v=" . rtrim(shell_exec("git describe --tags")));
            }
        }
        return parent::get_css_includes($local);
    }
}
?>
