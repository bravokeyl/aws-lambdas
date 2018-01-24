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

function dmatrix( rows, cols, defaultValue){
  var arr = [];
  for(var i=0; i < rows; i++){
      arr.push([]);
      arr[i].push( new Array(cols));
      for(var j=0; j < cols; j++){
        arr[i][j] = defaultValue;
      }
  }
  return arr;
}

function putDataToDB(d,device,datetime,channel){
  let col = "i";
  switch (channel) {
    case 1:
      col = "i1";
      break;
    case 2:
      col = "R";
      break;
    case 3:
      col = "i2";
      break;
    case 4:
      col = "Y";
      break;
    case 5:
      col = "i3";
      break;
    case 6:
      col = "B";
      break;
    default:
      console.log("Default switch channel");
  }
  var params = {
        TableName : putTableName,
        Key:{
          "device": device,
          "q": datetime.toString(),
        },
        UpdateExpression: "set "+col+" = :d, updatedAt = :uat, createdAt = if_not_exists(createdAt,:uat)",
        ExpressionAttributeValues:{
            ":d": d,
            ":uat": moment().utcOffset("+05:30").format('x')
        },
        ReturnValues:"UPDATED_NEW"
    };
  docClient.update(params, function(err, res) {
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
  } else {
    console.log("No Q in the record");
  }
  return Number(min);
}

const getHourChar = (s) => {
  let min = false;
  if(s.q){
    min = s.q.split('/');
    min = min[3];
  } else {
    console.log("No Q in the record");
  }
  return Number(min);
}

const formatNumber = d => {
  return isNaN(Number(d)) ? 0 : Number(d);
}

const getAveragePowerObj = items => {
  let avgPowerObj = {};
  let avgAppPower = 0;
  let avgPower = 0;
  let hrmin = "";
  let count = 0;
  let prevHrMin;
  items.map((item,index) => {
    let hr  = getHourChar(item);
    let min = getMinuteChar(item);
    if((hr+"-"+min) === hrmin){
      let nApP = formatNumber(item.apparentPower);
      let nP = formatNumber(item.power);
      avgAppPower += nApP;
      avgPower += nP;
      prevHrMin = (hr+"-"+min);
      count++;
      avgPowerObj[prevHrMin] = {
        "appPower": Number(parseFloat(avgAppPower/count).toFixed(3)) || 0,
        "power": Number(parseFloat(avgPower/count).toFixed(3)) || 0
      }
    } else {
      if(index == 0) {
        prevHrMin = (hr+"-"+min);
      } else {
        avgPowerObj[prevHrMin] = {
          "appPower": Number(parseFloat(avgAppPower/count).toFixed(3)) || 0,
          "power": Number(parseFloat(avgPower/count).toFixed(3)) || 0
        }
      }
      hrmin = (hr+"-"+min);
      avgAppPower = formatNumber(item.apparentPower);
      avgPower = formatNumber(item.power);
      count = 1;
    }
  });
  console.log(avgPowerObj);
  return avgPowerObj;
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
      if(event.params.querystring.c){
        channel = parseInt(event.params.querystring.c);
      }
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
    console.log("Device:",device);

    const params = {
      "TableName": tableName,
      "KeyConditionExpression" : 'device = :device and begins_with(q,:st)',
      "ExpressionAttributeValues": {
          ":device": device+"/"+channel,
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
            let avgPowerArr = getAveragePowerObj(data.Items);
            putDataToDB(avgPowerArr,device,st,channel);
            dayEnergy = avgPowerArr;
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
