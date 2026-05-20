<?php
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
?>
<div class="sjs-gpx-map-style <?php echo $this->css; ?>"
     data-sample-points="<?php echo htmlspecialchars($payload, ENT_QUOTES, 'UTF-8'); ?>">
    <div class="sjs-gpx-map-style__map"></div>
    <div class="sjs-gpx-map-style__empty" hidden>No route data yet.</div>
</div>
