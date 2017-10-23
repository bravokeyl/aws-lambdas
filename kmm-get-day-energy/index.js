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
    var st,lt,channel,limit,rSelect,cc,p,hk,rk,ddt,ddm;
    limit = 1;
    rSelect = "ALL_ATTRIBUTES";
    cc = "NONE";
    channel = "1";
    let kce = 'device = :device and ddt = :st';
    if(event.params && event.params.querystring && event.params.querystring.ddm){
      ddm = true;
      st = event.params.querystring.ddm;
      console.log("MonthDate String",event.params.querystring.ddm);
      kce = 'device = :device and begins_with(ddt,:st)';
      limit = 30;
    } else {
      ddm = false;
    }

    if(event.params && event.params.querystring && event.params.querystring.ddt){
      st = event.params.querystring.ddt;
      console.log("Date Query String",event.params.querystring.ddt);
      kce = 'device = :device and ddt = :st';
    } else {
      if(!ddm) {
        st = moment().utcOffset("+05:30").subtract(1, "days").format('YYYY/MM/DD');
      }
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
          "KeyConditionExpression" : kce,
          "ExpressionAttributeValues": {
              ":device": device,
              ":st": st,
          },
          "ScanIndexForward": false,
          // "Select": rSelect,
          "ReturnConsumedCapacity": cc,
          "Limit": limit
    };
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            var extraObj = {};
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
            var res = Object.assign({},returnData,extraObj)
            cb(null,res);
        }

   });
};
