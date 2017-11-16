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
function putDataToDB(en,device,date,lastReported){
  var params = {
        TableName : putTableName,
        Item:{
          "device": device,
          "ddt": date,
          "c1": Number(parseFloat(en["c1"]).toFixed(3)),
          "c2": Number(parseFloat(en["c2"]).toFixed(3)),
          "c3": Number(parseFloat(en["c3"]).toFixed(3)),
          "c4": Number(parseFloat(en["c4"]).toFixed(3)),
          "c5": Number(parseFloat(en["c5"]).toFixed(3)),
          "c6": Number(parseFloat(en["c6"]).toFixed(3)),
          "updatedAt": moment().utcOffset("+05:30").format('x'),
          "lastReported": lastReported
        }
    };
  docClient.put(params, function(err, res) {
      if (err) {
        console.error("Unable to put. Error JSON:", JSON.stringify(err, null, 2));
      }
  });
}
function enCheck(e,c) {
  if(e.c > 0) {
    dayEnergy[1] += e.c;
  }
  return dayEnergy;
}

function sumChannelEnergy(arr){
  if(Array.isArray(arr)) {
    let redArr = arr.reduce((a,b)=> { return a+b; },0);
    return redArr;
  } else {
    console.log("Not an array",arr);
    return  arr;
  }
}
function sumObjectsByKey(arr) {
  let keys = {
      "c2":0,
      "c3":0,
      "c4":0,
      "c5":0,
      "c6":0,
      "c1":0
    };
  arr.map((e,i)=>{
    // keys["c1"] += sumChannelEnergy(e["c1"]);
    keys["c2"] += sumChannelEnergy(e["c2"]);
    keys["c3"] += sumChannelEnergy(e["c3"]);
    keys["c4"] += sumChannelEnergy(e["c4"]);
    // keys["c5"] += sumChannelEnergy(e["c5"]);
    // keys["c6"] += sumChannelEnergy(e["c6"]);
  });
  console.log(keys,"SUMMED")
  return keys;
}


function energySumByChannel(data){
  let res = sumObjectsByKey(data);
  return res;
}
exports.handler = function(event,context,cb) {
    var st,lt,channel,limit,rSelect,cc,p,hk,rk,dhr;
    limit = 24;
    rSelect = "ALL_ATTRIBUTES";
    cc = "NONE";
    channel = "1";
    if(event.params && event.params.querystring && event.params.querystring.dhr){
      st = event.params.querystring.dhr;
      console.log("Date Query String",event.params.querystring.dhr);
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
          "KeyConditionExpression" : 'device = :device and begins_with(dhr,:st)',
          "ExpressionAttributeValues": {
              ":device": device,
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
            let dayEnergy = {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
            };
            var res = {};
            if(data.Items.length > 0) {
              let lastReported = data.Items[0].lastReported || 0;
              dayEnergy = energySumByChannel(data.Items);
              putDataToDB(dayEnergy,device,st,lastReported);
            }
            var extraObj = {
              device: device,
              day: st
            };
            res = Object.assign({},dayEnergy,extraObj);
            cb(null,res);
        }
   });
};
