$(function(){
    "use strict";

    var userTemplate = '{{#teacher}}<SuperSelect\
        icon="" text="Select Permissions"\
        button="left"\
        value="{{activePermissions}}"\
        multiple="true"\
        options="{{permissionList}}"\
    />{{/teacher}}\
    <table class="table table-bordered table-condensed" id="studentTable" >\
        <tr>\
            <th>Username</th><th>Name</th><th>Email</th>\
            {{#teacher}}<th>Permissions</th><th>Actions</th>{{/teacher}}\
        </tr>\
        {{#users:index}}\
            <tr style="background: {{calc_color(.permissions, activePermissions)}};" id="uid{{.id}}">\
                <td><label>{{#teacher}}<input type="checkbox" name="{{selectedUsers}}" value="{{index}}"/>{{/teacher}}{{{shorten(.username)}}}</label></td>\
                <td>{{{(.name?shorten(.name):"<em>Not set</em>")}}}</td>\
                <td>{{{(.email?shorten(.email):"<em>Not set</em>")}}}</td>\
                {{#teacher}}\
                <td>\
                    {{#is_missing(.permissions, activePermissions)}}<a on-tap="add:{{index}}" class="btn btn-small btn-yellow">Add Missing</a>{{/missing}}\
                    {{#has_extra(.permissions, activePermissions)}}<a on-tap="remove:{{index}}" class="btn btn-small btn-yellow">Remove Extra</a>{{/extra}}\
                    {{#(is_missing(.permissions, activePermissions) && has_extra(.permissions, activePermissions))}}\
                        <a on-tap="match:{{index}}" class="btn btn-small btn-yellow">Match Filter</a>\
                    {{/match}}\
                </td><td>\
                    {{#(.id !== viewer_id)}}\
                        <a on-tap="removeUser:{{.id}}" class="btn btn-small btn-magenta deleteUser"><i class="icon-trash"></i> Remove</a>\
                    {{/is_viewer}}\
                </td>\
                {{/teacher}}\
            </tr>\
        {{/users}}\
        {{#teacher}}<tr><td colspan="5">\
            <b>For selected:</b>\
            <!--<a on-tap="deletesel" class="btn btn-small btn-magenta deleteUser">Remove from Course</a>-->\
            <a on-tap="addsel" class="btn btn-small btn-yellow">Add Missing</a>\
            <a on-tap="removesel" class="btn btn-small btn-yellow">Remove Extra</a>\
            <a on-tap="matchsel" class="btn btn-small btn-yellow">Match Filter</a>\
        </td></tr>{{/teacher}}\
    </table>';

    /* Add back when setting the selection outside of superselect works:
                    {{#(is_missing(.permissions, activePermissions) || has_extra(.permissions, activePermissions))}}\
                        <a on-tap="select:{{index}}" class="btn btn-small btn-yellow">Select Permissions</a>\
                    {{/match}}\
    */

    var utable = new Ractive({
        el: document.getElementById('membertable'),
        template: userTemplate,
        data: {
            activePermissions: [],
            permissionList: memberPermissionList,
            selectedUsers: [],
            users: memberList,
            teacher: isTeacher,
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

    utable.on('removeUser', function(e,uid){
        //TODO: make this more AJAX-y, so it doesn't have to reload the whole page
        function getUsername(i){ return document.getElementById("studentTable").rows[i].cells[1].innerHTML; }
        var index = Number(e.keypath.substring(6)) + 1;
        var username = getUsername(index);

        // change "this user" to actual username
        if(confirm("Are you sure you want to remove " + username + " from the course?"))
        {
            var xhr = new XMLHttpRequest();
            xhr.addEventListener('load',function(){
                if(history.pushState){ history.pushState(null,"",xhr.responseURL); }
                document.open();
                document.write(xhr.responseText);
                document.close();
            },false);
            xhr.addEventListener('error',function(){ alert("Error removing course member."); },false);
            xhr.open("POST", "/course/"+courseId+"/remove/"+uid);
            xhr.send();
        }
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
        // remove extra permissions. Removes the permissions the user
        // possesses which are not currently selected
        var aperm = utable.get('activePermissions'),
            uperm = utable.get('users['+index+'].permissions'),
            nperm = uperm.filter(function(p){ return aperm.indexOf(p) === -1; });
        // nperm is a list of permissions to remove from the user
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