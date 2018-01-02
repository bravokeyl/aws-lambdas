'use strict';

const AWS = require('aws-sdk');
// const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const sortKey = "NM";

const getUserName= (event) => {
  let uname = false;
  if(event && event.params && event.params.querystring && event.params.querystring.un) {
    uname = event.params.querystring.un;
  }
  return uname;
}
exports.handler = function(event,context,cb) {
    console.log(event);
    let uname = getUserName(event);
    if(!uname){
      cb(null,{"statusCode":"403","message":"Access forbidden"});
      return;
    }
    var st,lt,channel,limit,rSelect,cc,p,hk,rk,ddt,ddm;
    limit = 1;
    rSelect = "ALL_ATTRIBUTES";
    cc = "NONE";
    st = sortKey
    let kce = 'uname = :user and site = :st';

    console.log("ST:",st,"Limit",limit);

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
              ":user": uname,
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
            var extraObj = {};
            if(cc=="TOTAL") {
              extraObj = {
                "capacity": data.ConsumedCapacity
              }
            }
            let returnData = {};
            if(data.Items.length > 0) {
              returnData = { "user": data.Items };
            }
            var res = Object.assign({},returnData,extraObj)
            cb(null,res);
        }

   });
};
