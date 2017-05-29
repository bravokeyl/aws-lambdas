'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = 'esp';
let itemsArray = [];

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('Pithre event length:', event.Records.length);
    event.Records.forEach((record,i) => {
        console.log(record.eventID);
        console.log(record.eventName);
        // console.log('DynamoDB Record: %j', record.dynamodb);
        let utime = Math.abs(record.dynamodb.NewImage.utime.N);
        let utc = new Date(utime);
        let ist = new Date(utime+19800000);// +5:30hrs
        let item = {
          PutRequest: {
            Item: {
              utime: utime ,
              host:  record.dynamodb.NewImage.host.S,
              raw: record.dynamodb.NewImage.raw.S,
              UTCDate: utc.toISOString(),
              ISTDate: ist.toISOString()
            }
          }
        };
        if(item){
          itemsArray[record.dynamodb.NewImage.host.S] = item;
        }
        console.log(itemsArray);
    });
    var params = {
      RequestItems: {
        'esp': itemsArray
      }
    };
    console.log("Pithre Length",itemsArray.length);
    console.log("Updating the item...");
    docClient.batchWrite(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
            callback(err, null);
        } else {
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
            callback(null, `Successfully processed ${event.Records.length} records.`);
        }
    });
};
