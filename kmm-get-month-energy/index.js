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
    var sd,lt,channel,limit,cc;
    limit = 12;
    cc = "NONE";
    channel = "1";
    let kce = 'device = :device and  begins_with(ddm,:sd)';
    let stdate = moment().utcOffset("+05:30").format("YYYY/");
    if(event.params && event.params.querystring && event.params.querystring.ddm){
      stdate = event.params.querystring.ddm;
      console.log("Year Query String",stdate);
    }
    console.log("SD:",stdate,"Limit",limit,"KeyCond",kce);

    const params = {
          "TableName": tableName,
          "KeyConditionExpression" : kce,
          "ExpressionAttributeValues": {
              ":device": device,
              ":sd": stdate,
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
