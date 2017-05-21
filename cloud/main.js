var twilio = require('twilio')('ACbdcc4de40bf470456400759ca79ae61f', '831b47ca0f6698d20d344670dfc45104');

Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});



Parse.Cloud.define("sendVerificationCode", function(request, response) {
    var verificationCode = 10000 + Math.floor(Math.random()*89999);
    
    
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


Parse.Cloud.define("addMembersToTask", function(request, response) {
    
    var taskId = request.params["tskId"]
    var members = request.params["tskMembers"] //members usernames actually

    console.log('Task id is -> ' + taskId);
    
    var Task = Parse.Object.extend("Task");
    var query = new Parse.Query(Task);
    
    query.get(taskId, {
      
      success: function(task) {
        console.log('Task found')
        response.success('Task found - YAY!!!')
        // The object was retrieved successfully.

        for(i = 1; i < members.length; i++){

          var userQuery = new Parse.Query(Parse.User);
          userQuery.equalTo("username", members[i]);  
          userQuery.find({
            success: function(u) {
              if (!isEmpty(u)){
              task.add("Members", u);
              task.save();
              console.log('Member added successfully')
              response.success('Member added successfully')
            }
            else{
              console.log('Member not found - Need to create new user');
              response.error('Member not found error -> ' + error.message);
              createNewParseUser(members[i], taskId);
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

function createNewParseUser(username, taskId){

          var user = new Parse.User();
          user.set("username", username);
          user.set("password", username);

          user.signUp(null, {
              success: function(user) {       
              console.log('Account for member created successfully -> ')
              

              var Task = Parse.Object.extend("Task");
    var query = new Parse.Query(Task);
    
    query.get(taskId, {
      
      success: function(task) {
        console.log('Task found')
        task.add("Members", u);
              task.save();
        console.log('Member added to task')
              response.success('Account for member created successfully, and member added to task')
},
      error: function(object, error) {
        console.log('internal Task fetch error ' + error.message);
        response.error('internal Task fetch error ' + error.message);
      }
    });







              

          },
          error: function(user, error) {
            console.log('Sorry! Culdn''t signup the user -> ' + error.message)
              response.error("Sorry! Culdn't signup the user -> " + error.message);
          } });
}

function isEmpty(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

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
    // fetch users
    var query = new Parse.Query(Parse.User);
    query.containedIn("username", members);
    query.find({
      success: function(results) {
        //alert("Successfully retrieved " + results.length + " scores.");
        // Do something with the returned Parse.Object values
        /*for (var i = 0; i < results.length; i++) {
          var object = results[i];
          alert(object.id + ' - ' + object.get('playerName'));
        }

        if(results.length > 0) {

          tsk.set("Members", results);
          tsk.set("Admin", results[0]);

        }

        tsk.save(null, {
          success: function(tsk) {
            // Execute any logic that should take place after the object is saved.
            response.success('New object created with objectId: ' + tsk.id);
          },
          error: function(tsk, error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            response.error('Failed to create new task, with error code: ' + error.message);
          }
        });
      },
      error: function(error) {
        response.error('Failed to fetch users, with error code: ' + error.message);
      }
  });
*/

/*
// Sample new Parse Server Cloud Code
Parse.Cloud.define('getMessagesForUser', function(request, response) {
  var user = request.user; // request.user replaces Parse.User.current()
  var token = user.getSessionToken(); // get session token from request.user

  var query = new Parse.Query('Messages');
  query.equalTo('recipient', user);
  query.find({ sessionToken: token }) // pass the session token to find()
    .then(function(messages) {
      response.success(messages);
    });
});*/