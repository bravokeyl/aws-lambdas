'use strict';

const AWS = require('aws-sdk');
const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const putTableName = process.env.DST_DDB;
const srcBucket = process.env.S3_SRC_BUCKET;
const dstBucket = process.env.S3_DST_BUCKET;
const todayDate = moment().format('YYYY/MM/DD');
const device = process.env.DEVICE_ID; //"esp8266_1ACD99";
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
          "c1": en[1],
          "c2": en[2],
          "c3": en[3],
          "c4": en[4],
          "c5": en[5],
          "c6": en[6],
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
function channelSplit(d,sep){
  return d.split(sep);
}
function extractChannels(d) {
  let darr = channelSplit(d.data,'z\n');
  if(darr.length != 7) {
    bklog("warn","Channels length not equal to 6, length is: " + (darr.length-1));
    bklog("info","Check this Data: "+d.data);
  }
  return darr;
}
function singleChannel(data) {
  let d = data.split(',');
  let c,pow,en,v,irms,ticks;
  data = [];
  let c1 = [];
  if( d.length != columnLength ) {
    bklog("warn","Channel column length not equal to 20, length is: "+d.length);
    bklog("info","Check this Data: "+d);
  }
  if(d.length>0 && (d.length == columnLength)) {
    d.forEach((p,j) => {
      let fc = p.charAt(0);
      // Discard all other data except required
      switch (fc) {
        case 'e':
          en = p.slice(1);
          break;
        case 'p':
          pow = p.slice(1);
          break;
        case 'v':
          v = p.slice(1);
          break;
        case 'i':
          irms = p.slice(1);
          break;
        case 'c':
          c = p.slice(1);
          break;
        case 'b':
          ticks = p.slice(2);
          break;
        default:
      }
    });
    data = {
      "channel": c,
      "energy": en,
      "power": pow,
      "current": irms,
      "voltage": v,
      "ticks": ticks
    };
  }
  return data;
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
function checkDataReset(d) {
  let o = {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
  };
  let split = [];
  for(let c=1;c<7;c++){
    let p = d[c];
    let gotFirst = false;
    let initial = 0;
    p.forEach(function(e,i){
      if(!gotFirst) {
        initial = e.energy;
        let inpower = e.power;
        if(initial && inpower && inpower > 0) {
          gotFirst = true;
        }
      }
      if(i>0){
        if(e.ticks){
          let prev = p[i-1].ticks;
          let next = e.ticks;
          if(!isNaN(Number(prev)) && !isNaN(Number(next))){
            if(next-prev < 0){
              console.log("Reset Happened",e,p[i-1]);
              let hourEnergy = p[i-1].energy-initial;

              if(hourEnergy>0){
                let db = hourEnergy/1000000;
                o[c].push(db);
                if(e.energy){
                  initial = e.energy;
                } else {
                  gotFirst = false;
                }
              }
            }
          }
        }
      }
      if(i == (p.length-1)) {
        let end = getDefinedValues(p,i,initial,-1);
        console.log("End: ", end," Initial: ",initial);
        let db = (end-initial)/1000000;
        db = isNaN(db) ? 0 : db;
        o[c].push(db);
      }
    });
  }
  return o;
}
function getHourEnergy(items) {
  let channelsObj = {
    "1": [],
    "2": [],
    "3": [],
    "4": [],
    "5": [],
    "6": [],
  };
  let hourEnergy = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
  };

  items.forEach(function(e,i){
    let channels = extractChannels(e);
    channels.forEach(function(e,i){
      if(e.length>0){
        let channel = singleChannel(e);
        if(channelsObj[channel.channel]) {
          channelsObj[channel.channel].push(channel);
        }
      }
    });
    if(i>0){
      let diff = items[i-1].timestamp - items[i].timestamp;
    }
  });
  let he = checkDataReset(channelsObj);
  return he;
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
          "ExpressionAttributeNames": {
            "#d": "data",
            "#t": "timestamp"
          },
          "ExpressionAttributeValues": {
              ":device": device,
              ":st": st,
          },
          "ProjectionExpression":"#t,#d",
          "ScanIndexForward": true,
          // "Select": rSelect,
          "ReturnConsumedCapacity": cc,
          "Limit": limit
    };
    docClient.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read. Error JSON:", JSON.stringify(err, null, 2));
            console.log("Errored Event",event);
            cb(null,err);
        } else {
            let hourEnergy = {
              "1": 0,
              "2": 0,
              "3": 0,
              "4": 0,
              "5": 0,
              "6": 0,
            };
            let updatedAt = 0;
            let reslength = 0;
            if(data.Items){
              reslength = data.Items.length;
            }
            if( reslength > 0) {
              hourEnergy = getHourEnergy(data.Items);
              updatedAt = data.Items[reslength-1].timestamp || 0;
            }
            //putDataToDB(hourEnergy,device,st,updatedAt,reslength);
            var extraObj = {
              device: device,
              hour: st
            };
            var res = Object.assign({},hourEnergy,extraObj);
            cb(null,res);
        }

   });
};
