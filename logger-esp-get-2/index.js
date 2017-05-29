'use strict';
console.log("Loading the lambda function");

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = 'esp';

exports.handler = function(event,context,cb) {

    console.log(event);

    const params = {
          "TableName": tableName,
          "Limit": 6
    };

    docClient.scan(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            console.log("Get succeeded:", JSON.stringify(data, null, 2));
            cb(null,data);
        }
   });
};
