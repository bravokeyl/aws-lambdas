'use strict';

const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const putTableName = process.env.DST_DDB;

function putDataToDB(event){
  const { clientId, timestamp, eventType, clientInitiatedDisconnect, topics, sessionIdentifier, principalIdentifier, createdAt } = event;
  var params = {
        TableName : putTableName,
        Item:{
          "device": clientId,
          "q": createdAt+"-"+eventType,
          "eventType": eventType,
          "clientInitiatedDisconnect": clientInitiatedDisconnect || "NA",
          "sessionIdentifier": sessionIdentifier,
          "principalIdentifier": principalIdentifier,
          "topics": topics || "NA",
          "createdAt": timestamp,
        }
    };
  docClient.put(params, function(err, res) {
      if (err) {
        console.error("Unable to put. Error JSON:", JSON.stringify(err, null, 2));
      }
  });
}

exports.handler = function(event,context,cb) {
    console.log("Event: ",event);
    putDataToDB(event);
};
