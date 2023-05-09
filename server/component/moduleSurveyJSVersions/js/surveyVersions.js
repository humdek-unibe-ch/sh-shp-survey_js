$(document).ready(function () {
    //datatable projects
    var table = $('#survey-js-versions').DataTable({
        "order": [[0, "desc"]]
    });

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
        showConfirmationMethod: (confirmation) => {
            $.confirm({
                title: confirmation.title,
                content: confirmation.content,
                buttons: {
                    confirm: function () {
                        return confirmation.callback(true);
                    },
                    cancel: function () {
                        return confirmation.callback(false);
                    }
                }
            });
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
                    var ids = row[0].DT_RowId.split('-');
                    window.open('formsActions/select/' + parseInt(ids[2]), '_blank')
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
                    $.ajax({
                        type: 'post',
                        url: window.location,
                        dataType: "json",
                        data: { mode: "restore", version_id: row[0][0] },
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

});