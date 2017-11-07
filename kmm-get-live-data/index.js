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
    channel = device+"/2";

    if(event.params && event.params.querystring && event.params.querystring.c){
      channel = device+"/"+event.params.querystring.c;
    }
    st = moment().utcOffset("+05:30").format("YYYY/MM/DD");
    if(event.params && event.params.querystring && event.params.querystring.d){
      st = moment().utcOffset("+05:30").format("YYYY/MM/DD/HH/HH-mm");
    }
    console.log("Channel:",channel,"Query:",st);

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
          "KeyConditionExpression" : 'device = :device and begins_with(q,:st)',
          "ExpressionAttributeValues": {
              ":device": channel,
              ":st": st,
          },
          "ScanIndexForward": false,
          "ReturnConsumedCapacity": cc,
          "Limit": limit
    };
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            console.log("Data",data);
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