'use strict';
console.log('Version 0.1.3');

var aws = require('aws-sdk');

var ses = new aws.SES();
var s3 = new aws.S3();

exports.handler = function (event, context, cb) {

    console.log("Event: " + JSON.stringify(event));
    let rvars = {
      email: 'b@bravokeyl.com',
      username: null,
      verificationCode: null
    };

    if ( rvars.email == null) {
        rvars.email = "b@bravokeyl.com";
    }

    var config = require('./config.js');

    // Make sure some expected results are present
    // if (rvars.username == null) {
    //     rvars.username = event.request.userAttributes.email;
    // }

    if (rvars.subject == null) {
        rvars.subject = config.defaultSubject;

        if (rvars.subject == null) {
            rvars.subject = "Data Loss: Records lessthan 800";
        }
    }

    console.log('Loading template from ' + config.templateKey + ' in ' + config.templateBucket);
    var image = event.Records[0].dynamodb.NewImage;
    var device = image.device.S;
    var hour = image.hour.S;
    var count = image.count.N;
    if(count>800) {
      console.log("No need to send email, enough records(>800), records:",count);
      cb(null,event);
      return;
    }
    console.log("Template Body: " + image);

    // Convert newlines in the message
    if (event.message != null) {
        event.message = event.message
        .replace("\r\n", "<br />")
        .replace("\r", "<br />")
        .replace("\n", "<br />");
    }

    // Perform the substitutions
    // var mark = require('markup-js');

    var subject = rvars.subject;
    console.log("Final subject: " + subject);

    var message = JSON.stringify(image);
    console.log("Final message: " + message);

    var params = {
        Destination: {
            ToAddresses: [
                'bravokeyl@gmail.com'
            ]
        },
        Message: {

            Subject: {
                Data: rvars.subject,
                Charset: 'UTF-8'
            }
        },
        Source: config.fromAddress,
        ReplyToAddresses: [
            "Logger Team" + '<b@bravokeyl.com>'
        ]
    };

    var fileExtension = config.templateKey.split(".").pop();
    if (fileExtension.toLowerCase() == 'html') {
        params.Message.Body = {
            Html: {
                Data: message,
                Charset: 'UTF-8'
            }
        };
    } else if (fileExtension.toLowerCase() == 'txt') {
        params.Message.Body = {
            Text: {
                Data: message,
                Charset: 'UTF-8'
            }
        };
    } else {
        cb(null,'Internal Error: Unrecognized template file extension: ' + fileExtension);
        return;
    }

    // Send the email
    ses.sendEmail(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            cb(null,'Internal Error: The email could not be sent.');
        } else {
            let msg = 'The email was successfully sent to '+ rvars.email;
            console.log(msg,data);
            cb(null,event);
        }
    });
};
