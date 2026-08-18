<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<tr class="cursor-pointer">
    <td><?php echo $version['id']; ?></td>
    <?php /* base64: raw JSON in a cell is parsed as HTML by the browser and read back mangled, see surveyVersions.js */ ?>
    <td><?php echo base64_encode($version['config']); ?></td>
    <td><?php echo $version['created_at']; ?></td>
    <td><?php echo $version['user_email']; ?></td>
    <td><?php echo $version['restored_at']; ?></td>
</tr>
