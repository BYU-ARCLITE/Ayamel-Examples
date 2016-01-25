$(function(){
    "use strict";

    var userTemplate = '<superselect\
        icon="" text="Select Permissions"\
        button="left"\
        selection="{{activePermissions}}"\
        multiple="true"\
        options="{{permissionList}}"\
    />\
    <table class="table table-bordered table-condensed">\
        <tr>\
            <th>Id</th><th>Auth Scheme</th><th>Username</th><th>Name</th><th>Email</th>\
            <th>Merged?</th><th>Permissions</th><th>Actions</th>\
        </tr>\
        {{#users:index}}\
            <tr style="background: {{calc_color(.permissions, activePermissions)}};" id="uid{{.id}}">\
                <td><label><input type="checkbox" name="{{selectedUsers}}" value="{{index}}"/>{{.id}}</label></td>\
                <td>{{.authScheme}}</td><td>{{{shorten(.username)}}}</td>\
                <td>{{{(.name?shorten(.name):"<em>Not set</em>")}}}</td>\
                <td>{{{(.email?shorten(.email):"<em>Not set</em>")}}}</td>\
                <td>{{{(.linked === -1 ? "No" : "Yes: #"+.linked)}}}</td>\
                <td>\
                    {{#is_missing(.permissions, activePermissions)}}<a on-tap="add:{{index}}" class="btn btn-small btn-yellow">Add Missing</a>{{/missing}}\
                    {{#has_extra(.permissions, activePermissions)}}<a on-tap="remove:{{index}}" class="btn btn-small btn-yellow">Remove Extra</a>{{/extra}}\
                    {{#(is_missing(.permissions, activePermissions) && has_extra(.permissions, activePermissions))}}\
                        <a on-tap="match:{{index}}" class="btn btn-small btn-yellow">Match Filter</a>\
                    {{/match}}\
                </td><td>\
                    {{#(.id !== viewer_id)}}\
                        <a on-tap="proxy:{{.id}}" class="btn btn-small btn-yellow">Proxy</a>\
                        <a on-tap="notify:{{.id}}" class="btn btn-small btn-blue sendNote">Notify</a>\
                        <a on-tap="delete:{{.id}}" class="btn btn-small btn-magenta deleteUser">Delete</a>\
                    {{/is_viewer}}\
                </td>\
            </tr>\
        {{/users}}\
        <tr><td colspan="8">\
            <b>For selected:</b>\
            <!--<a on-tap="deletesel" class="btn btn-small btn-magenta deleteUser">Delete</a>-->\
            <a on-tap="addsel" class="btn btn-small btn-yellow">Add Missing</a>\
            <a on-tap="removesel" class="btn btn-small btn-yellow">Remove Extra</a>\
            <a on-tap="matchsel" class="btn btn-small btn-yellow">Match Filter</a>\
        </td></tr>\
    </table>';

    /* Add back when setting the selection outside of superselect works:
                    {{#(is_missing(.permissions, activePermissions) || has_extra(.permissions, activePermissions))}}\
                        <a on-tap="select:{{index}}" class="btn btn-small btn-yellow">Select Permissions</a>\
                    {{/match}}\
    */
    
    var utable = new Ractive({
        el: document.getElementById('usertable'),
        components: { superselect:  EditorWidgets.SuperSelect },
        template: userTemplate,
        data: {
            activePermissions: [],
            permissionList: userPermissionList,
            selectedUsers: [],
            users: userList,
            viewer_id: viewer_id,
            shorten: function(str) {
                return str.length < 16?str:
                    '<span title="'+str+'">'+str.substr(0,12)+'...</span>';
            },
            is_missing: function(uperm, aperm){
                return aperm.some(function(p){ return uperm.indexOf(p) === -1; });
            },
            has_extra: function(uperm, aperm){
                return uperm.some(function(p){ return aperm.indexOf(p) === -1; });
            },
            calc_color: function(uperm, aperm){
                var missing = aperm.some(function(p){ return uperm.indexOf(p) === -1; }),
                    extra = uperm.some(function(p){ return aperm.indexOf(p) === -1; });
                return missing?
                    (extra?"#FF00FF":"#FFFFFF"):
                    (extra?"#AAAAFF":"#AAFFAA");
            }
        }
    });

    utable.on('add', function(e,index){
        addUserPermissions(index).then(null,function(e){
            alert("Error updating permissions");
        });
    });
    utable.on('remove', function(e,index){
        removeUserPermissions(index).then(null,function(e){
            alert("Error updating permissions");
        });
    });
    utable.on('match', function(e,index){
        matchUserPermissions(index).then(null,function(e){
            alert("Error updating permissions");
        });
    });
    
    /*utable.on('select', function(e,index){
        utable.set('activePermissions', utable.get("users")[index].permissions);
    });*/

    utable.on('proxy', function(e,id){
        window.location = "/admin/proxy/"+id;
    });
    utable.on('notify', function(e,id){
        $("#noteUserId").val(id);
        $("#noteUserIdDisplay").text(id);
        $("#notificationModal").modal('show');
    });
    utable.on('delete', function(e,id){
        $("#deleteUserId").text(id);
        $("#deleteForm").attr("action", "/admin/users/" + id + "/delete");
        $("#deleteModal").modal('show');
    });

    utable.on('addsel', function(){
        Promise.all(utable.get("selectedUsers").map(addUserPermissions))
        .then(null,function(e){
            alert("Error updating permissions");
        });
    });
    utable.on('removesel', function(){
        utable.get("selectedUsers").map(removeUserPermissions)
        .then(null,function(e){
            alert("Error updating permissions");
        });
    });
    utable.on('matchsel', function(){
        utable.get("selectedUsers").map(matchUserPermissions)
        .then(null,function(e){
            alert("Error updating permissions");
        });
    });
    //utable.on('deletesel', function(){alert("Unimplemented");});

    function updateUserPermissions(index, perms, operation){
        var data = new FormData();
        data.append("userId", utable.get("users")[index].id);
        perms.forEach(function(p){ data.append("permission", p); });
        return Promise.resolve($.ajax({
            url: permUrl + (operation || ""),
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            type: "post",
            dataType: "text"
        })).then(function(data){
            switch(operation) {
                case "remove":
                    var uperm = utable.get('users['+index+'].permissions');
                    perms.forEach(function(p) { uperm.splice(uperm.indexOf(p), 1); });
                    break;
                case "match":
                    utable.set('users['+index+'].permissions', perms);
                    break;
                case "add":
                    var uperm = utable.get('users['+index+'].permissions');
                    perms.forEach(function(p){ uperm.push(p); });
                    break;
            }
        });
    }

    function addUserPermissions(index){
        var aperm = utable.get('activePermissions'),
            uperm = utable.get('users['+index+'].permissions'),
            nperm = aperm.filter(function(p){ return uperm.indexOf(p) === -1; });
        if(nperm.length === 0){ return Promise.resolve(true); }
        [].push.apply(nperm, uperm);
        return updateUserPermissions(index, nperm, 'add');
    }

    function removeUserPermissions(index){
        var aperm = utable.get('activePermissions'),
            uperm = utable.get('users['+index+'].permissions'),
            // gets all permissions the user has which are not active
            nperm = uperm.filter(function(p){ return aperm.indexOf(p) === -1; });
        // updates the permissions if there are any to update (in nperm)
        if(nperm.length === 0){ return Promise.resolve(true); }
        return updateUserPermissions(index, nperm, 'remove');
    }

    function matchUserPermissions(index){
        var aperm = utable.get('activePermissions'),
            uperm = utable.get('users['+index+'].permissions');
        if(aperm.length === uperm.length &&
            aperm.every(function(p){ return uperm.indexOf(p) > -1; }) &&
            uperm.every(function(p){ return aperm.indexOf(p) > -1; })
        ){ return Promise.resolve(true); }
        return updateUserPermissions(index, aperm, 'match');
    }
});