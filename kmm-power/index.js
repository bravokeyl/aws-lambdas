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

  // Creates all lines:
  for(var i=0; i < rows; i++){

      // Creates an empty line
      arr.push([]);

      // Adds cols to the empty line:
      arr[i].push( new Array(cols));

      for(var j=0; j < cols; j++){
        // Initializes:
        arr[i][j] = defaultValue;
      }
  }

return arr;
}


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

const splitDataIntoMinuteGroups = (data) => {
  // Array(24).fill().map(()=> []);
  let outData = dmatrix(24,60,[0]);
  console.log(typeof outData);
  // [...new Array(60)].map(x => [0]);
  let prev,cur;
  let minGroup = [];
  data.map((e,i)=>{
    let min = getMinuteChar(e);
    let hour =  getHourChar(e);
    if(min >= 0 && min < 60) {
      // console.log(e.q,min);
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
          outData[hour][prev] = minGroup;
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
  console.log(typeof outData);

  return outData;
}

const getAveragePowerArr = items => {
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
      let nApP = Number(item.apparentPower);
      let nP = Number(item.power);
      avgAppPower += isNaN(nApP)? 0: nApP;
      avgPower += isNaN(nP)? 0: nP;
      prevHrMin = (hr+"-"+min);
      count++;
    } else {
      if(index == 0) {
        prevHrMin = (hr+"-"+min);
      } else {
        avgPowerObj[prevHrMin] = {
          "appPower": avgAppPower/count,
          "power": avgPower/count
        }
      }
      hrmin = (hr+"-"+min);
      avgAppPower = isNaN(Number(item.apparentPower))?0:Number(item.apparentPower);
      avgPower = isNaN(Number(item.power))?0:Number(item.power);
      count = 1;
    }
  });
  console.log(avgPowerObj);
  return [avgPowerObj];
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
              //let minGroups = splitDataIntoMinuteGroups(data.Items);
              let avgPowerArr = getAveragePowerArr(data.Items);
              // console.log(minGroups.length);
              // console.log(typeof minGroups);
              // let row,col;
              // for(row = 9;row<10;row++){
              //   console.log(row,typeof minGroups[row]);
              //   for(col = 0; col<60;col++){
              //     let appPowerTotal,powerTotal;
              //     console.log(row,col,typeof minGroups[row][col],minGroups[row][col]);
              //     dayEnergy = minGroups[row];
              //     appPowerTotal = minGroups[row].reduce(
              //       function(r,o){
              //         console.log("App",o[0],o.length)
              //         r.sum += Number(o[0].appPower) || 0;
              //         ++r.count
              //         return r;
              //       },
              //     {sum: 0, count: 0});
              //     powerTotal = minGroups[row].reduce(
              //       function(r,o){
              //         r.sum += Number(o[0].power) || 0;
              //         ++r.count
              //         return r;
              //       },
              //     {sum: 0, count: 0});
              //     let appPowerAvg = Number(parseFloat(appPowerTotal.sum/appPowerTotal.count).toFixed(3));
              //     let powerAvg = Number(parseFloat(powerTotal.sum/powerTotal.count).toFixed(3));
              //     console.log("Totals:",appPowerAvg,powerAvg,minGroups[row][col][0].q || 'No Date');
              //   }
              // }
              // minGroups.map((d,i)=>{
              //   console.log(typeof d,i,d[i],d);
              //   d.map((e,j) =>{
              //     console.log(typeof e,e,j,d[j]);
              //
              //   });
              //   // console.log("Totals:",appPowerAvg,powerAvg,e[0].q);
              // });
              // dayEnergy = minGroups;
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
