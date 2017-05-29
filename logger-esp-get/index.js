'use strict';
console.log("Loading the lambda function");

const AWS = require('aws-sdk');
const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = 'iot-esp';

exports.handler = function(event,context,cb) {

    console.log(event);

    var a = moment(event.params.querystring.date);
    console.log("Date Query String",event.params.querystring.date);
    var q1 = a.isValid();

    var st,lt,channel,limit;
    limit = 1;
    if( event.params.querystring.date ) {
      console.log("Date given");
      st = (a.utc().valueOf())*10;
      lt = (parseInt(st)+ 86400000);
    } else {
      st = (moment(moment().format('YYYY-MM-DD')).utc().valueOf());
      lt = (parseInt(st)+ 86400000);
    }

    console.log(a.utc().format(),st,"Date",moment(lt).utc().format(),lt);
    channel = "1";
    if(event.params.path.c) {
      channel = event.params.path.c;
    }
    if(event.params.querystring.l){
      limit = parseInt(event.params.querystring.l);
    }
    const params = {
          "TableName": tableName,
          "KeyConditionExpression" : 'host = :hostmax and utime between :st and :lt ',
          // "ExpressionAttributeNames" :{
          //       "#tid": "trackerId"
          // },
          "ExpressionAttributeValues": {
              // ":hostmin": "1",
              ":hostmax": channel.toString(),
              ":st": st,
              ":lt": lt
          },
          // 'ProjectionExpression' : 'host,powac,enac,utime',
          "ScanIndexForward": false,
          "Limit": limit
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            console.log("Get succeeded:", JSON.stringify(data, null, 2));
            cb(null,data);
        }
   });
};
