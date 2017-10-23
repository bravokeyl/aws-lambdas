'use strict';

const AWS = require('aws-sdk');
const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const todayDate = moment().format('YYYY/MM/DD');
const device = process.env.DEVICE_ID; //"esp8266_1ACD99";

exports.handler = function(event,context,cb) {
    var st,lt,channel,limit,rSelect,cc,p,hk,rk,dhr,ddt;
    limit = 1;
    rSelect = "ALL_ATTRIBUTES";
    cc = "NONE";
    channel = "1";

    if(event.params && event.params.querystring && event.params.querystring.ddt){
      st = event.params.querystring.ddt;
      console.log("Date Query String",event.params.querystring.ddt);
    } else {

    }

    if(event.params && event.params.querystring && event.params.querystring.dhr){
      st = event.params.querystring.dhr;
      console.log("DateHour Query String",event.params.querystring.dhr);
    } else {
      if(event.params.querystring.ddt)
      var a = moment().utc().format('x').valueOf();
      st = moment(Number(a)+270*60*1000).format('YYYY/MM/DD/HH');
    }

    console.log("ST:",st);

    if(event.params){
      if(event.params.querystring.select){
        rSelect = "ALL_ATTRIBUTES";
      }
      if(event.params.querystring.cc){
        cc = "TOTAL";
      }
    }

    const params = {
          "TableName": tableName,
          "KeyConditionExpression" : 'device = :device and begins_with(dhr,:st)',
          "ExpressionAttributeValues": {
              ":device": device,
              ":st": st,
          },
          "ScanIndexForward": false,
          "ReturnConsumedCapacity": cc,
          "Limit": 24
    };
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            let extraObj = {};
            if(cc=="TOTAL") {
              extraObj = {
                "capacity": data.ConsumedCapacity
              }
            }
            let returnData = data.Items[0];
            if(data.Items.length > 1) {
              returnData = {
                energy: data.Items
              };
            }
            var res = Object.assign({},returnData,extraObj);
            cb(null,res);
        }

   });
};
