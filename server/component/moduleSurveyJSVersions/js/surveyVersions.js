$(document).ready(function () {
    initVersionsTable();
});

function initVersionsTable() {
    //datatable projects
    var table = $('#survey-js-versions').DataTable({
        "order": [[0, "desc"]]
    });

    table.column(1).visible(false);


    table.on('click', 'tr[id|="formAction-url"]', function (e) {
        var ids = $(this).attr('id').split('-');
        document.location = 'formsActions/select/' + parseInt(ids[2]);
    });

    var actionOptions = {
        iconPrefix: 'fas fa-fw',
        classes: [],
        contextMenu: {
            enabled: true,
            isMulti: false,
            xoffset: -10,
            yoffset: -10,
            headerRenderer: function (rows) {
                if (rows.length > 1) {
                    // For when we have contextMenu.isMulti enabled and have more than 1 row selected
                    return rows.length + ' actions selected';
                } else if (rows.length > 0) {
                    let row = rows[0];
                    return 'Survey Version ' + row[0] + ' selected';
                }
            },
        },
        buttonList: {
            enabled: true,
            iconOnly: false,
            containerSelector: '#my-button-container',
            groupClass: 'btn-group',
            disabledOpacity: 0.4,
            dividerSpacing: 10,
        },
        deselectAfterAction: false,
        items: [
            // Empty starter separator to demonstrate that it won't render
            {
                type: 'divider',
            },

            {
                type: 'option',
                multi: false,
                title: 'View',
                iconClass: 'fa-eye',
                buttonClasses: ['btn', 'btn-outline-secondary'],
                contextMenuClasses: ['text-secondary'],
                action: function (row) {
                    try {
                        surveyContent = JSON.parse(row[0][1]);
                        var version_id = row[0][0];
                        initModalRestoreBtn(version_id);
                        var survey = new Survey.Model(surveyContent);
                        $('#survey-js-version-viewer').Survey({ model: survey });
                        $(".survey-js-modal-holder").modal({
                            backdrop: false
                        });
                    } catch (error) {
                        console.log(error);
                        $.alert({
                            title: 'Error',
                            type: "red",
                            content: 'Corrupted version!',
                        });
                    }
                },
                isDisabled: function (row) {
                },
            },

            {
                type: 'divider',
            },

            {
                type: 'option',
                multi: false,
                title: 'Restore',
                iconClass: 'fa-window-restore',
                buttonClasses: ['btn', 'btn-outline-success'],
                contextMenuClasses: ['text-warning'],
                action: function (row) {
                    var version_id = row[0][0];
                    restore_version(version_id);
                },
                isDisabled: function (row) {
                },
            },



            // Empty ending separator to demonstrate that it won't render
            {
                type: 'divider',
            },
        ],
    };

    table.contextualActions(actionOptions);
}

function restore_version(version_id) {
    $.confirm({
        title: 'Restore old version!',
        content: 'Are you sure that you want to restore version <code>' + version_id + '</code>',
        buttons: {
            confirm: function () {
                $.ajax({
                    type: 'post',
                    url: window.location,
                    dataType: "json",
                    data: { mode: "restore", version_id: version_id },
                    success: function (r) {
                        if (r.result) {
                            window.location = $('#survey-js-back').attr('href'); // go back to the survey
                        } else {
                            $.alert({
                                title: 'Error',
                                type: "red",
                                content: 'Failed to restore the survey or the survey is the same as the one that you want to restore!',
                            });
                        }
                    }
                });
            },
            cancel: function () {

            }
        }
    });
}

function initModalRestoreBtn(version_id) {
    $("#survey-js-restore").off('click').on('click', () => {
        restore_version(version_id);
    });
}
