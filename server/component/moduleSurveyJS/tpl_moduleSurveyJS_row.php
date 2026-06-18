<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<tr class="cursor-pointer" id="surveys-js-url-<?php echo $survey['id']; ?>">
    <td><?php echo $survey['id']; ?></td>
    <td><?php echo $survey['survey_generated_id']; ?></td>
    <td><?php echo $survey['survey_name']; ?></td>
    <td><?php echo $survey['created_at']; ?></td>
    <td><?php echo $survey['updated_at']; ?></td>
    <td><?php echo $survey['published'] ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>'; ?></td>
    <?php $hasPending = !$survey['published_at'] || $survey['updated_at'] > $survey['published_at']; ?>
    <td><?php echo $hasPending ? '<span class="badge bg-warning text-dark">Yes</span>' : '<span class="badge bg-secondary">No</span>'; ?></td>
</tr>
