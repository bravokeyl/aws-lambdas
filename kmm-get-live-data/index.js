'use strict';

const AWS = require('aws-sdk');
const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const todayDate = moment().format('YYYY/MM/DD');
const device = process.env.DEVICE_ID;

const queryPromises = (st,cc,limit) => {
  const channels = [1, 2, 3, 4, 5, 6];
  return Promise.all(channels.map((c) => {
      let params = {
        "TableName": tableName,
        "KeyConditionExpression" : 'device = :device and begins_with(q,:st)',
        "ExpressionAttributeValues": {
          ":device": device+'/'+c,
          ":st": st,
        },
        "ScanIndexForward": false,
        "ReturnConsumedCapacity": cc,
        "Limit": limit,
      };
      return docClient.query(params).promise();
    })
  );
}
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
    queryPromises(st,cc,limit)
    .then((data) => {
      // console.log("Data",data);
      let extraObj = {};
      if(cc=="TOTAL") {
        extraObj = {
          "capacity": data.ConsumedCapacity
        }
      }

      let res = {
        "i1": {},
        "i2": {},
        "i3": {},
        "R": {},
        "Y": {},
        "B": {},
      };

      if(data.length > 1) {
        let returnData = data.map((e)=>{
          if(e && e.Items && e.Items.length > 0) {
            return e.Items[0];
          }
          return {};
        });
        returnData.map((e) => {
          switch (e.channel) {
            case '1':
              res['i1'] = e;
              break;
            case '2':
              res['R'] = e;
              break;
            case '3':
              res['Y'] = e;
              break;
            case '4':
              res['B'] = e;
              break;
            case '5':
              res['i2'] = e;
              break;
            case '6':
              res['i3'] = e;
              break;
            default:
              console.log('Default case');
          }
        });
        console.log("Mapped data:", returnData);
      }
      cb(null, res);
    })
    .catch(console.error.bind(console));
};
