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
    rvars.email = event.request.userAttributes.email;
    rvars.username = event.userName;
    rvars.verificationCode = event.request.codeParameter;
    if ( rvars.email == null) {
        rvars.email = "b@bravokeyl.com";
    }

    var config = require('./config.js');

    // Make sure some expected results are present
    if (rvars.username == null) {
        rvars.username = event.request.userAttributes.email;
    }

    if (rvars.subject == null) {
        rvars.subject = config.defaultSubject;

        if (rvars.subject == null) {
            rvars.subject = "Nuevosol: Password reset for Nuevo Logger";
        }
    }

    console.log('Loading template from ' + config.templateKey + ' in ' + config.templateBucket);

    // Read the template file
    s3.getObject({
        Bucket: config.templateBucket,
        Key: config.templateKey
    }, function (err, data) {
        if (err) {
            // Error
            console.log(err, err.stack);
            cb(null,'Internal Error: Failed to load template from s3.')
        } else {
            var templateBody = data.Body.toString();
            console.log("Template Body: " + templateBody);

            // Convert newlines in the message
            if (event.message != null) {
                event.message = event.message
                .replace("\r\n", "<br />")
                .replace("\r", "<br />")
                .replace("\n", "<br />");
            }

            // Perform the substitutions
            var mark = require('markup-js');

            var subject = rvars.subject;
            console.log("Final subject: " + subject);

            var message = mark.up(templateBody, rvars);
            console.log("Final message: " + message);

            var params = {
                Destination: {
                    ToAddresses: [
                        rvars.email,
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

            //event.response.smsMessage = "Welcome to the service. Your confirmation code is " + event.request.codeParameter;
            event.response.emailSubject = subject;
            event.response.emailMessage = message;

            // Send the email
            // ses.sendEmail(params, function (err, data) {
            //     if (err) {
            //         console.log(err, err.stack);
            //         cb(null,'Internal Error: The email could not be sent.');
            //     } else {
            //         let msg = 'The email was successfully sent to '+ rvars.email;
            //         console.log(msg,data);
            //         cb(null,event);
            //     }
            // });
            cb(null,event);
        }
    });
};
