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
const device = process.env.DEVICE_ID;
const columnLength = process.env.COL_LENGTH || 20;
const currLogLevel = process.env.LOG_LEVEL !== null ? process.env.LOG_LEVEL : 'error';

const logLevels = {error: 4, warn: 3, info: 2, verbose: 1, debug: 0};
function bklog(logLevel, statement) {
    if(logLevels[logLevel] >= logLevels[currLogLevel] ) {
        console.log(statement);
    }
}

function putDataToDB(en,device,hour,updatedAt,count){
  var params = {
        TableName : putTableName,
        Item:{
          "device": device,
          "dhr": hour,
          "c1": en.e1,
          "c2": en.e2,
          "c3": en.e3,
          "c4": en.e4,
          "c5": en.e5,
          "c6": en.e6,
          "updatedAt": moment().utcOffset("+05:30").format('x'),
          "lastReported": updatedAt,
          "count": count,
        }
    };
  docClient.put(params, function(err, res) {
    if (err) {
      console.error("Unable to put. Error JSON:", JSON.stringify(err, null, 2));
      console.log("Errored Event",en);
    }
  });
}
function getDefinedValues(d,index,initial,order){
  let start = initial;
  if(index>0){
    if(d[index].energy && d[index].energy>0 && d[index].power && d[index].power > 0) {
      if((d[index].energy-start) > 0) {
        return d[index].energy;
      } else {
        return getDefinedValues(d,(index+order),start,order);
      }
    } else {
      return getDefinedValues(d,(index+order),start,order);
    }
  }
}
function checkData(r){
  if( isNaN(Number(r)) ) {
    return false;
  }
  if(r<0) {
    return false;
  }
  return true;
}
function checkDataReset(d) {
  let gotFirst = false;
  let initialEnergy = 0;
  let o = [];
  d.forEach(function(e,i){
    let {energy,power,voltage,current,timestamp,ticks} = e;
    if(!gotFirst) {
      initialEnergy = energy;
      let initialPower = power;
      if(initialEnergy && initialPower && initialPower > 0) {
        gotFirst = true;
        console.log("Initial Energy:",initialEnergy,ticks,i);
      }
    }
    if(i>0){
      if(ticks){
        let prev = d[i-1].ticks;
        let next = ticks;
        if(!isNaN(Number(prev)) && !isNaN(Number(next))){
          if(next-prev < 0){
            console.log("Reset Happened",initialEnergy,d[i-1].energy);
            let hourEnergy = parseFloat(d[i-1].energy-initialEnergy).toFixed(4);
            console.log("Number",hourEnergy);
            if(hourEnergy>0){
              let db = Number(hourEnergy);
              o.push(db);
              gotFirst = false;
            }
          }
        }
      }
    }
    if(i == (d.length-1)) {
      let end = getDefinedValues(d,i,initialEnergy,-1);
      console.log("End: ", end," Initial: ",initialEnergy);
      let db = (end-initialEnergy);
      db = isNaN(db) ? 0 : Number(parseFloat(db).toFixed(4));
      o.push(db);
    }
  });
  return o;
}
function getHourEnergy(items) {
  let hourEnergy = 0;
  let he = checkDataReset(items);
  return he;
}

function processData(data,c) {
    let updatedAt = 0;
    let reslength = 0;
    let hourEnergy = 0;
    console.log("Channel: ",c);
    if(data.Items){
      reslength = data.Items.length;
      console.log("Length: ",reslength);
    }
    if( reslength > 0) {
      hourEnergy = getHourEnergy(data.Items);
      console.log("hourEnergy",hourEnergy,"Channel:",c)
      updatedAt = data.Items[reslength-1].timestamp || 0;
      console.log("updatedAt: ",updatedAt);
    }
    var extraObj = {
      updatedAt: updatedAt,
      hourEnergy: hourEnergy
    };
    var res = Object.assign({},extraObj);
    return res;
};

function getChannelData(c,st,limit,cc){
  let params = {
    "TableName": tableName,
    "KeyConditionExpression" : 'device = :device and begins_with(q,:st)',
    "ExpressionAttributeValues": {
        ":device": device+"/"+c,
        ":st": st,
    },
    "ScanIndexForward": true,
    "ReturnConsumedCapacity": cc,
    "Limit": limit
  };
  let promise = docClient.query(params).promise();
  return promise;
}


exports.handler = function(event,context,cb) {
    var st,lt,channel,limit,rSelect,cc,p,hk,rk,dhr;
    limit = 1000;
    rSelect = "ALL_ATTRIBUTES";
    cc = "NONE";
    channel = "1";
    if(event.params && event.params.querystring && event.params.querystring.dhr){
      st = event.params.querystring.dhr;
      console.log("Date Query String",event.params.querystring.dhr);
    } else {
      st = moment().utcOffset("+05:30").format('YYYY/MM/DD/HH');
    }
    console.log("Hour ST:",st);

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

    Promise.all([
      getChannelData(1,st,limit,cc),
      getChannelData(2,st,limit,cc),
      getChannelData(3,st,limit,cc),
      getChannelData(4,st,limit,cc),
      getChannelData(5,st,limit,cc),
      getChannelData(6,st,limit,cc)
    ])
    .then(function(allData) {
        let edata = allData;
        let c1 = processData(allData[0],1);
        let c2 = processData(allData[1],2);
        let c3 = processData(allData[2],3);
        let c4 = processData(allData[3],4);
        let c5 = processData(allData[4],5);
        let c6 = processData(allData[5],6);
        let updatedAt = c1.updatedAt;
        let hourEnergy = {
          e1: c1.hourEnergy,
          e2: c2.hourEnergy,
          e3: c3.hourEnergy,
          e4: c4.hourEnergy,
          e5: c5.hourEnergy,
          e6: c6.hourEnergy,
        }
        let reslength = allData[0].Items.length;
        console.log("Final Output:",c1,c2,c3,c4,c5,c6);
        putDataToDB(hourEnergy,device,st,updatedAt,reslength);
    })
    .catch(function(err){
      console.log(err.stack);
    });
};
