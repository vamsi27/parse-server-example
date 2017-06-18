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

Parse.Cloud.define("deleteUserFromTask", function(request, response) {

    var taskId = request.params["taskId"]
    var userId = request.params["userId"]

    var Task = Parse.Object.extend("Task");
    var query = new Parse.Query(Task);

    query.get(taskId, {
        success: function(task) {

            var members = task.get("Members");

            if (members.length == 1) {
                //destroy the task
                task.destroy({
                    success: function(t) {
                        console.log('Task ' + t.id + ' deleted successfully')
                    },
                    error: function(myObject, error) {
                        console.log('Failed to delete Task ' + t.id)
                    }
                });
            } else {
                
                    var userQuery = new Parse.Query(Parse.User);
                    userQuery.get(userId, {
                    success: function(u) {

                        //fetch current user, and remove from members
                        task.remove("Members", u);

                        //set nextusername/member to nil if it's pointing to current user
                        if (task.get("NextTurnUserName") == u.get("username")) {
                            console.log('Removing current user from next turn')
                            task.unset("NextTurnUserName");
                            task.unset("NextTurnMember");
                        }

                        //take next member and make him admin
                        var remainingMembers = task.get("Members")
                        var newAdminId = remainingMembers[0].id
                        task.set("Admin", Parse.User.createWithoutData(newAdminId));

                        task.save();
                        console.log('Member ' + u.get("username") + ' removed successfully from task ' + task.id + ' and user ' + newAdminId + ' is the new admin')

                    },
                    error: function(object, error) {
                        console.log('Member fetch error -> ' + error.message);
                        response.error('Member fetch error -> ' + error.message);
                    }
                });
            }

            response.success('task found and user removed')

        },
        error: function(object, error) {
            response.error('User could not be removed from the task')
        }
    });
});

Parse.Cloud.define("addMembersToTask", function(request, response) {

    var taskId = request.params["tskId"]
    var members = request.params["tskMembers"] //members usernames actually

    console.log('addMembersToTask Start - Task id is -> ' + taskId);

    var Task = Parse.Object.extend("Task");
    var query = new Parse.Query(Task);

    query.get(taskId, {

        success: function(task) {
            console.log('Task found - Task id is -> ' + task.id)
            response.success('Task found - YAY!!!')
            // The object was retrieved successfully.

            for (i = 1; i < members.length; i++) {
                var memUName = members[i];

                var userQuery = new Parse.Query(Parse.User);
                userQuery.equalTo("username", members[i]);

                console.log('Start processing member ' + i + ' -> ' + members[i])

                userQuery.first({

                    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$ ' + userQuery)
                    console.log('@@@@@@@@@@@')

                    success: function(u) {
                        if (!isEmpty(u)) {
                            // you can add to array by directly passing in object    
                            u.add("Tasks", task);
                            u.save(null, {
                                useMasterKey: true
                            });
                            console.log('Added Task to Users taks list -> ' + u.get("username"))

                            // or u can add by creating empty object with id - both ways only pointer gets saved in array
                            task.add("Members", Parse.User.createWithoutData(u.id));
                            task.save();
                            console.log('Member added successfully to task')
                            response.success('Member added successfully to task')
                        } else {
                            console.log('Member ' + memUName + ' not found - Need to create account');
                            createNewParseUser(memUName, task);
                            response.error('Member not found but account may have been created -> ' + error.message);
                        }
                    },
                    error: function(object, error) {
                        console.log('Member fetch error -> ' + error.message);
                        response.error('Member fetch error -> ' + error.message);
                    }
                });

            }
        },
        error: function(object, error) {
            console.log('Task fetch error ' + error.message);
            response.error('Task fetch error ' + error.message);
        }
    });
});

function createNewParseUser(username, task) {
    console.log('CReating new account for User --> ' + username)
    var user = new Parse.User();
    user.set("username", username);
    user.set("password", username);
    user.add("Tasks", task)

    user.signUp(null, {
        success: function(user) {
            console.log('signup for member successfull -> ' + user.get("username"))

            user.add("Tasks", task);
            u.save(null, {
                useMasterKey: true
            });
            console.log('Added Task to User -> ' + user.get("username"))

            task.add("Members", user);
            task.save();
            console.log('Member ' + user.get("username") + ' added to task')
        },
        error: function(user, error) {
            console.log("Sorry! Couldn't signup the user -> " + error.message)
            //response.error("Sorry! Culdn't signup the user -> " + error.message);
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