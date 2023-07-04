<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
require_once __DIR__ . "/../../../../component/BaseHooks.php";
require_once __DIR__ . "/../../../../component/style/BaseStyleComponent.php";

/**
 * The class to define the hooks for the plugin.
 */
class SurveyJSHooks extends BaseHooks
{
    /* Constructors ***********************************************************/

    /**
     * The constructor creates an instance of the hooks.
     * @param object $services
     *  The service handler instance which holds all services
     * @param object $params
     *  Various params
     */
    public function __construct($services, $params = array())
    {
        parent::__construct($services, $params);
    }

    /* Private Methods *********************************************************/

    /**
     * Output select SurveyJS field
     * @param string $value
     * Value of the field
     * @param string $name
     * The name of the fields
     * @param int $disabled 0 or 1
     * If the field is in edit mode or view mode (disabled)
     * @return object
     * Return instance of BaseStyleComponent -> select style
     */
    private function outputSelectSurveyJSField($value, $name, $disabled)
    {
        return new BaseStyleComponent("select", array(
            "value" => $value,
            "name" => $name,
            "max" => 10,
            "live_search" => 1,
            "is_required" => 1,
            "disabled" => $disabled,
            "items" => $this->db->fetch_table_as_select_values('view_surveys', 'id', array('survey_generated_id', 'survey_name'))
        ));
    }

    /**
     * Output select SurveyJS themes
     * @param string $value
     * Value of the field
     * @param string $name
     * The name of the fields
     * @param int $disabled 0 or 1
     * If the field is in edit mode or view mode (disabled)
     * @return object
     * Return instance of BaseStyleComponent -> select style
     */
    private function outputSelectSurveyJSThemes($value, $name, $disabled)
    {
        return new BaseStyleComponent("select", array(
            "value" => $value,
            "name" => $name,
            "max" => 10,
            "live_search" => 0,
            "is_required" => 1,
            "disabled" => $disabled,
            "items" => $this->db->fetch_table_as_select_values('lookups', 'lookup_code', array('lookup_value'), 'WHERE type_code = :type_code', array(":type_code" => SURVEY_JS_THEMES))
        ));
    }

    /**
     * Return a BaseStyleComponent object
     * @param object $args
     * Params passed to the method
     * @param int $disabled 0 or 1
     * If the field is in edit mode or view mode (disabled)
     * @return object
     * Return a BaseStyleComponent object
     */
    private function returnSelectSurveyJSField($args, $disabled)
    {
        $field = $this->get_param_by_name($args, 'field');
        $res = $this->execute_private_method($args);
        if ($field['name'] == 'survey-js') {
            $field_name_prefix = "fields[" . $field['name'] . "][" . $field['id_language'] . "]" . "[" . $field['id_gender'] . "]";
            $selectField = $this->outputSelectSurveyJSField($field['content'], $field_name_prefix . "[content]", $disabled);
            if ($selectField && $res) {
                $children = $res->get_view()->get_children();
                $children[] = $selectField;
                $res->get_view()->set_children($children);
            }
        } else if ($field['name'] == 'survey-js-theme') {
            $field_name_prefix = "fields[" . $field['name'] . "][" . $field['id_language'] . "]" . "[" . $field['id_gender'] . "]";
            $selectField = $this->outputSelectSurveyJSThemes($field['content'], $field_name_prefix . "[content]", $disabled);
            if ($selectField && $res) {
                $children = $res->get_view()->get_children();
                $children[] = $selectField;
                $res->get_view()->set_children($children);
            }
        }
        return $res;
    }

    /* Public Methods *********************************************************/

    /**
     * Return a BaseStyleComponent object
     * @param object $args
     * Params passed to the method
     * @return object
     * Return a BaseStyleComponent object
     */
    public function outputFieldSurveyJSEdit($args)
    {
        return $this->returnSelectSurveyJSField($args, 0);
    }

    /**
     * Return a BaseStyleComponent object
     * @param object $args
     * Params passed to the method
     * @return object
     * Return a BaseStyleComponent object
     */
    public function outputFieldSurveyJSView($args)
    {
        return $this->returnSelectSurveyJSField($args, 1);
    }

    /**
     * Set csp rules for SurveyJS     
     * @return string
     * Return csp_rules
     */
    public function setCspRules($args)
    {
        $res = $this->execute_private_method($args);
        $resArr = explode(';', strval($res));
        foreach ($resArr as $key => $value) {
            if (strpos($value, 'script-src') !== false) {
                $value = str_replace("'unsafe-inline'", "'unsafe-inline' 'unsafe-eval'", $value);
                $resArr[$key] = $value;
            } else if (strpos($value, 'font-src') !== false) {
                $value = str_replace("'self'", "'self' https://fonts.gstatic.com", $value);
                $resArr[$key] = $value;
            }
        }
        return implode(";", $resArr);
    }

    /**
     * Set csp rules for SurveyJS     
     * @return string
     * Return csp_rules
     */
    public function get_sensible_pages($args)
    {
        $res = $this->execute_private_method($args);
        $res[] = PAGE_SURVEY_JS_MODE;
        return $res;
    }
}
?>
