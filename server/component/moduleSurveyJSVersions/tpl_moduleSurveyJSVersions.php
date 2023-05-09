<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<div class="container-fluid mt-3">
    <div class="row">
        <div class="col-auto">
            <?php $this->output_side_buttons(); ?>
        </div>
        <div class="col">
            <div class="jumbotron">
                <h1>SurveyJS Versions</h1>
                <p>This page shows all saved versions for survey <code><?php echo $this->survey['survey_name'] ?> </code>. A version is saved when the survey is published.
                </p>
            </div>
            <div class="mb-3">
                <table id="survey-js-versions" class="table table-sm table-hover">
                    <thead>
                        <tr>
                            <th scope="col">Version ID</th>
                            <th scope="col">Created At</th>
                            <th scope="col">User</th>
                            <th scope="col">Restored At</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $this->output_actions_rows(); ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>