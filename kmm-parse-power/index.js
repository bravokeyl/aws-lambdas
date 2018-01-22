'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const putTableName = process.env.DST_DDB;



function deDuplicate(data){
  let pdata = [];
  return pdata;
}
function extractChannels(data) {
  let darr = data.split("z\n");
  return darr;
}
function channelData(data) {
  let d = data.split(',');
  let c,pow,en,v,irms,ticks,reactivePower,reactiveEnergy,apparentPower,apparentEnergy;
  data = [];
  let c1 = [];
  reactivePower = d[17];
  apparentPower = d[18];
  reactiveEnergy = d[15];
  apparentEnergy = d[16];

  if(d.length>0) {
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
      "ticks": ticks,
      "reactivePower": reactivePower,
      "reactiveEnergy": reactiveEnergy,
      "apparentPower": apparentPower,
      "apparentEnergy": apparentEnergy
    };
  }
  return data;
}
function putDataToDB(params,cb,retry=false) {
  if(retry) {
    console.log("Processing UnprocessedItems:");
  }
  let pp = params;
  docClient.batchWrite(params, function(err, data) {
      if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          cb(err, null);
      } else {
          // console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          if(data.UnprocessedItems && data.UnprocessedItems["kmm-data"]
          && data.UnprocessedItems["kmm-data"].length > 0) {
            console.log("BKUnprocessedItems:",data.UnprocessedItems["kmm-data"].length);
            var params = {
              RequestItems: data.UnprocessedItems
            };
            //putDataToDB(params,cb,true);
          } else{
            cb(null, "Successfully processed records.");
          }
      }
  });
}
function splitArrayIntoChunks(arr,chunkSize){
  var groups = arr.map( function(e,i){
    return i%chunkSize===0 ? arr.slice(i,i+chunkSize) : null;
  })
  .filter(function(e){ return e; });
  return groups;
}
exports.handler = (event, context, callback) => {
    let data = event.data;
    let channels = extractChannels(data);
    let itemsArray = [];
    channels.forEach((e,i)=>{
      let cd = channelData(e);
      let q = event.q;
      let datehour = q.split("/");
      if(datehour.length == 5) {
        datehour.pop(1);
        datehour = datehour.join("/");
      }
      let device = event.device;
      let timestamp = event.timestamp;
      let ttl = parseInt(Number(timestamp/1000)+(24*60*60*90));
      if(cd.channel) {
        let item = {
          PutRequest: {
            Item: {
              device: device+"/"+cd.channel ,
              q: q,
              datehour: datehour,
              timestamp: timestamp,
              channel: cd.channel,
              energy: Number(cd.energy/1000000) || "0bk",
              power: Number(cd.power/1000) || "0bk",
              reactivePower: Number(cd.reactivePower/1000) || "0bk",
              reactiveEnergy: Number(cd.reactiveEnergy/1000000) || "0bk",
              apparentPower: Number(cd.apparentPower/1000) || "0bk",
              apparentEnergy: Number(cd.apparentEnergy/1000000) || "0bk",
              current: Number(cd.current/1000) || "0bk",
              voltage: Number(cd.voltage/1000) || "0bk",
              ticks: cd.ticks,
              ttl: ttl
            }
          }
        };
        itemsArray.push(item);
      }
    });

    if(itemsArray.length > 0){
      if(itemsArray.length == 6) {
        var params = {
          RequestItems: {
            "kmm-data" : itemsArray
          }
        };
        putDataToDB(params,callback);
      } else {
        console.log("Items Length Not 6 + err");
        console.log("%j",event);
      }
    } else {
        callback(null, "Nothing to process");
    }
};
