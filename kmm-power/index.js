'use strict';

const AWS = require('aws-sdk');
const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const putTableName = process.env.DST_DDB;
const todayDate = moment().format('YYYY/MM/DD');
const device = process.env.DEVICE_ID; //"esp8266_1ACD99";

function putDataToDB(en,device,month,lastReported){
  var params = {
        TableName : putTableName,
        Item:{
          "device": device,
          "timestamp": month,
          "power": en,
          "updatedAt": moment().utcOffset("+05:30").format('x'),
          "lastReported": lastReported || "NA"
        }
    };
  docClient.put(params, function(err, res) {
      if (err) {
        console.error("Unable to put. Error JSON:", JSON.stringify(err, null, 2));
      }
  });
}
const getMinuteChar = (s) => {
  let min = false;
  if(s.q){
    min = s.q.split('-');
    min = min[1];
  }
  return Number(min);
}
const splitDataIntoMinuteGroups = (data) => {
  let outData = [...new Array(60)].map(x => [0]);
  let prev,cur;
  let minGroup = [];
  data.map((e,i)=>{
    let min = getMinuteChar(e);
    if(min >= 0 && min < 60) {
      cur = min;
      if(i>0){
        prev = getMinuteChar(data[i-1]);
        if(cur === prev){
          minGroup.push({
            appPower: e.apparentPower,
            power: e.power,
            q: e.q
          });
        } else {
          minGroup.forEach((d,j)=>{
            
          });
          outData[prev] = minGroup;
          minGroup = [];
          minGroup.push({
            appPower: e.apparentPower,
            power: e.power,
            q: e.q
          });
        }
      } else {
        minGroup.push({
          appPower: e.apparentPower,
          power: e.power,
          q: e.q
        });
      }
    } else {
      console.log("Malformed Minute:", e.q,min);
    }
  });
  return outData;
}

exports.handler = function(event,context,cb) {
    var st,lt,channel,limit,rSelect,cc,p,hk,rk,dhr;
    limit = 5000;
    rSelect = "ALL_ATTRIBUTES";
    cc = "NONE";
    channel = "1";
    if(event.params && event.params.querystring && event.params.querystring.ddt){
      st = event.params.querystring.ddt;
      console.log("Query String",event.params.querystring.ddt);
    } else {
      st = moment().utcOffset("+05:30").format('YYYY/MM/DD');
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
              ":device": device+"/1",
              ":st": st,
          },
          "ScanIndexForward": false,
          "ReturnConsumedCapacity": cc,
          // "Limit": limit
    };
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            cb(null,err);
        } else {
            let dayEnergy;
            if(data.Items.length > 0) {
              console.log(data.Items.length);
              let lastReported = data.Items[0].lastReported || 0;
              // putDataToDB(dayEnergy,device,st,lastReported);
              let minGroups = splitDataIntoMinuteGroups(data.Items);
              console.log(minGroups.length);
              console.log(minGroups);
              dayEnergy = minGroups;
            }

            var extraObj = {
              device: device,
              hour: st
            };
            var res = Object.assign({},dayEnergy,extraObj)
            cb(null,dayEnergy);
        }

   });
};
