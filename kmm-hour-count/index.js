'use strict';
console.log("Loading the lambda function");

const AWS = require('aws-sdk');
const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const putTableName = process.env.DST_DDB;
const srcBucket = process.env.S3_SRC_BUCKET;
const dstBucket = process.env.S3_DST_BUCKET;
const todayDate = moment().format('YYYY/MM/DD');
const device = process.env.DEVICE_ID; //"esp8266_1ACD99";
function putDataToDB(data,device,hour){
  var params = {
        TableName : putTableName,
        Item:{
          "device": device,
          "hour": hour,
          "count": data.Count
        }
    };
  docClient.put(params, function(err, res) {
      if (err) {
        console.error("Unable to put. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Put succeeded:", JSON.stringify(res, null, 2));
      }
  });
}
exports.handler = function(event,context,cb) {

    console.log(event);
    var st,lt,channel,limit,rSelect,cc,p,hk,rk,dhr;
    limit = 1000;
    rSelect = "COUNT";
    cc = "NONE";
    channel = "1";
    if(event.params && event.params.querystring && event.params.querystring.dhr){
      st = event.params.querystring.dhr;
      console.log("Date Query String",event.params.querystring.dhr);
    } else {
      var a = moment().utc().format('x').valueOf();
      st = moment(Number(a)+270*60*1000).format('YYYY/MM/DD/HH');
    }
    console.log("ST:",st);

    if(event.params){
      if(event.params.querystring.l){
        limit = parseInt(event.params.querystring.l);
      }
      if(event.params.querystring.select){
        rSelect = "ALL_ATTRIBUTES";
      }
      if(event.params.querystring.cc){
        cc = "TOTAL";
      }
    }

    const params = {
          "TableName": tableName,
          "KeyConditionExpression" : 'device = :device and begins_with(q,:st)',
          "ExpressionAttributeValues": {
              ":device": device,
              ":st": st,
          },
          "ScanIndexForward": false,
          "Select": rSelect,
          "ReturnConsumedCapacity": cc,
          "Limit": limit
    };
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            console.log("Get succeeded:", JSON.stringify(data, null, 2));
            putDataToDB(data,device,st);
            var extraObj = {
              device: device,
              hour: st
            };
            var res = Object.assign({},data,extraObj)
            cb(null,res);
        }

   });
};
