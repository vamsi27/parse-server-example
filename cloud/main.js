var twilio = require('twilio')('ACbdcc4de40bf470456400759ca79ae61f', '831b47ca0f6698d20d344670dfc45104');

Parse.Cloud.define('hello', function(req, res) {
    res.success('Hi');
});

Parse.Cloud.define("sendVerificationCode", function(request, response) {

    // makes sure the code is always 5 digits
    var verificationCode = 10000 + Math.floor(Math.random() * 89999);

    twilio.sendSms({
        From: "7864204937",
        To: request.params["phoneNumber"],
        Body: "Your verification code is " + verificationCode
    }, function(err, responseData) {
        if (err) {
            response.error(err);
        } else {
            response.success(verificationCode);
        }
    });
});

Parse.Cloud.define("sendNotification", function(request, response) {
    var query = new Parse.Query(Parse.Installation);
    query.equalTo('username', request.params["username"]);

    var taskName = request.params["taskName"]

    Parse.Push.send({
        where: query,
        data: {
            alert: "It's your turn to " + taskName,
            //expiration_time: getNextWeek(),
            badge: "Increment", //ios only
            sound: "bamboo.caf" //ios only
            //,title: "" //android only
        }
    }, {
        useMasterKey: true,
        success: function() {
            response.success('Sent N')
        },
        error: function(error) {
            response.success('Couldnt send the notification')
        }
    });
});

function getNextWeek(){
    var today = new Date();
    var nextweek = new Date(today.getFullYear(), today.getMonth(), today.getDate()+7);
    return nextweek;
}

Parse.Cloud.define("deleteUserFromTask", function(request, response) {

    var taskId = request.params["taskId"]
    var userIds = request.params["tskMembersRemoved"]

    if(userIds.length == 0){
        response.success('No user found to remove')
        return
    }

    console.log('Starting deleteUserFromTask')

    var Task = Parse.Object.extend("Task");
    var query = new Parse.Query(Task);
    query.include("Admin");

    query.get(taskId, {
        success: function(task) {
            for (i = 0; i < userIds.length; i++) {
                console.log('Remving user -> ' + userIds[i])
                removeEachUserFromTask(userIds[i], task, i == userIds.length - 1, response)
            }
        },
        error: function(object, error) {
            response.error('User could not be removed from the task')
        }
    });
});

function removeEachUserFromTask(userId, task, raiseResponse, response) {

    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo("username", userId);
    userQuery.first({
        success: function(u) {

            // remove the task from user's list
            u.remove("Tasks", task);
            u.save(null, {
                useMasterKey: true
            });

            console.log('Task removed from users list')


            var members = task.get("Members");

            if (members.length == 1 && members[0].id == u.id) {
                //destroy the task
                task.destroy({
                    success: function(t) {
                        console.log('Task ' + t.id + ' deleted successfully')
                        response.success('task found and user removed')
                    },
                    error: function(myObject, error) {
                        console.log('Failed to delete Task ' + t.id)
                        response.error('couldnt destroy the task')
                    }
                });
            } else {

                task.remove("Members", u);

                //set nextusername/member to nil if it's pointing to current user
                if (task.get("NextTurnUserName") == u.get("username")) {
                    console.log('Removing current user from next turn')
                    task.unset("NextTurnUserName");
                    task.unset("NextTurnMember");
                }

                //take next member and make him admin
                if (task.get("Admin").id == u.id) {
                    var remainingMembers = task.get("Members")
                    var newAdminId = remainingMembers[0].id
                    task.set("Admin", Parse.User.createWithoutData(newAdminId));
                    console.log("New admin has been set")
                } else {
                    console.log("user not an admin, so no need to set a new admin")
                }

                task.save();
                console.log('Member ' + u.get("username") + ' removed successfully from task ' + task.get("Name") + ' -> ' + task.id)
                if (raiseResponse) {
                    response.success('task found and user removed its members list')
                }
            }
        },
        error: function(object, error) {
            console.log('Member fetch error -> ' + error.message);
            if (raiseResponse) {
                response.error('Member fetch error -> ' + error.message);
            }
        }
    });
}

Parse.Cloud.define("addMembersToTask", function(request, response) {

    var taskId = request.params["taskId"]
    var members = request.params["tskMembers"] //members phonenumbers (parse usernames) actually
    var isNewTask = request.params["isNewTask"]

    if(members.length == 0){
        response.success('No member found to add')
        return
    }

    console.log('addMembersToTask Start - Task id is -> ' + taskId);
    console.log('Is new task? -> ' + isNewTask);

    var Task = Parse.Object.extend("Task");
    var query = new Parse.Query(Task);

    query.get(taskId, {

        success: function(task) {
            console.log('Task found - Task id is -> ' + task.id)
            // The object was retrieved successfully.

            var stIndex = isNewTask == 1 ? 1 : 0

            for (i = stIndex; i < members.length; i++) {
                var memUsername = members[i];
                fetchUserAndAddtoTask(memUsername, task, (members.length -1) == stIndex, response)
            }
        },
        error: function(object, error) {
            console.log('Task fetch error ' + error.message);
            response.error('Task fetch error ' + error.message);
        }
    });
});

function fetchUserAndAddtoTask(username, task, raiseResponse, response) {

    var userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo("username", username);

    console.log('inside fetchUserAndAddtoTask')
    console.log('Start processing member ' + username)

    userQuery.first({
        success: function(u) {
            if (!isEmpty(u)) {
                // you can add to array by directly passing in object    
                u.add("Tasks", task);
                u.save(null, {
                    useMasterKey: true
                });
                console.log('Added Task to Users taks list -> ' + u.get("username"))

                task.add("Members", Parse.User.createWithoutData(u.id));
                task.save();
                console.log('Member added successfully to task -> ' + task.id)
                if(raiseResponse) {
                    console.log('Raising response')
                    response.success('Task found and hopefully all members have been added to the task, and task to the members.')
                }
            } else {
                console.log('###########')
                console.log('Member ' + username + ' not found - Need to create account');
                createNewParseUser(username, task, raiseResponse, response);
            }
        },
        error: function(object, error) {
            console.log('Member fetch error -> ' + error.message);
            response.error('Member fetch error -> ' + error.message);
        }
    });
}

function createNewParseUser(username, task, raiseResponse, response) {
    console.log('Creating new account for User --> ' + username)
    var user = new Parse.User();
    user.set("username", username);
    user.set("password", username);
    user.add("Tasks", task)

    user.signUp(null, {
        success: function(u) {
            console.log('signup for member successfull -> ' + u.get("username") + ' with task id -> ' + task.id)

            task.add("Members", Parse.User.createWithoutData(u.id));
            task.save();
            console.log('Member ' + u.get("username") + ' added to task')
            if(raiseResponse) {
                console.log('Raising success response after signing up user')
                response.success('Task found and hopefully all members have been added to the task, and task to the members.')
            }
        },
        error: function(user, error) {
            console.log("Sorry! Couldn't signup the user -> " + error.message)
            response.error("Sorry! Culdn't signup the user -> " + error.message);
        }
    });
}

function isEmpty(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0) return false;
    if (obj.length === 0) return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}

/*
Parse.Cloud.define("createNewUser", function(request, response) {

    var success = 0
    var fails = 0
    var count = request.params["count"]
    var num = parseInt(count)

    for(count = 1; count <= parseInt(num); count++){

      

        var phnNum = 1000000000 + Math.floor(Math.random()*8999999999);

          // extract passed in details 
        var username = '+1'+phnNum.toString();
        var pw = username
        //var email = request.params.email

        // cloud local calls
        var user = new Parse.User();
        user.set("username", username);
        user.set("password", pw);
        //user.set("email", email);

        user.signUp(null, {
            success: function(user) {       
            //response.success("working");
            // do other stuff here 
            // like set ACL
            // create relationships
            // and then save again!! using user.save
            // you will need to use Parse.Cloud.useMasterKey(); 

            success = success + 1

        },
        error: function(user, error) {
            //response.error("Sorry! " + error.message);
            fails = fails + 1
        } });
               
    }

    //response.success('Pass = ' + success.toString() + ' Fail = ' + fails.toString())

});

Parse.Cloud.define("verifyPhoneNumber", function(request, response) {
    var user = request.user;
    var verificationCode = user.get("phoneVerificationCode");
    if (verificationCode == request.params.phoneVerificationCode) {
        user.set("phoneNumber", request.params.phoneNumber);
        user.save();
        response.success("Success");
    } else {
        response.error("Invalid verification code.");
    }
});

*/