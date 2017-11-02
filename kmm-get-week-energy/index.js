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

const getCurrentWeekRange = () => {
  let days = [];
  // for(let i=0;i<7;i++){
    days.push(moment().utcOffset("+05:30").weekday(0).format("YYYY/MM/DD"));
    days.push(moment().utcOffset("+05:30").weekday(6).format("YYYY/MM/DD"));
  // }
  return days;
}

exports.handler = function(event,context,cb) {
    var sd,lt,channel,limit,cc;
    limit = 7;
    cc = "NONE";
    channel = "1";
    let kce = 'device = :device and ddt between  :sd and :ed';
    let wk = getCurrentWeekRange();
    let stdate = wk[0];
    let enddate = wk[1];

    console.log("SD:",stdate,"ED:",enddate,"Limit",limit,"KeyCond",kce);

    const params = {
          "TableName": tableName,
          "KeyConditionExpression" : kce,
          "ExpressionAttributeValues": {
              ":device": device,
              ":sd": stdate,
              ":ed": enddate,
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
            var extraObj = {};
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
