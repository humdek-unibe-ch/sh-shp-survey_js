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
     * Set csp rules for Qualtrics     
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
            }else if (strpos($value, 'font-src') !== false) {
                $value = str_replace("'self'", "'self' https://fonts.gstatic.com", $value);                
                $resArr[$key] = $value;
            }
        }
        return implode(";", $resArr);
    }
}
?>
