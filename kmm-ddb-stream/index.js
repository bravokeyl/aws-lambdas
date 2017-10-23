'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = process.env.SRC_DDB;
const putTableName = process.env.DST_DDB;

let itemsArray = [];

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
  let c,pow,en,v,irms,ticks;
  data = [];
  let c1 = [];
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
      "ticks": ticks
    };
    // console.log(data)
  }
  return data;
}
function putDataToDB(params,cb,retry=false) {
  //console.log("PARAMS: %j",params);
  if(retry) {
    console.log("Processing UnprocessedItems:");
  }
  let pp = params;
  docClient.batchWrite(params, function(err, data) {
      if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          //console.log("BKDuplicates: %j",pp);
          cb(err, null);
      } else {
          // console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
          if(data.UnprocessedItems && data.UnprocessedItems["kmm-stream"]
          && data.UnprocessedItems["kmm-stream"].length > 0) {
            console.log("BKUnprocessedItems:",data.UnprocessedItems["kmm-stream"].length);
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
    // console.log('Received event:', JSON.stringify(event, null, 2));
    // console.log('Pithre event length:', event.Records.length);
    event.Records.forEach((record,i) => {
        // console.log(record.eventID);
        // console.log(record.eventName);
        let data = record.dynamodb.NewImage.data.S;
        let channels = extractChannels(data);
        channels.forEach((e,i)=>{
          let cd = channelData(e);
          // console.log(cd,"Channel DTA")
          let q = record.dynamodb.NewImage.q.S;
          let datehour = q.split("/");
          if(datehour.length == 5) {
            datehour.pop(1);
            datehour = datehour.join("/");
            // console.log("Q:",q);
          }
          let device = record.dynamodb.NewImage.device.S;
          let timestamp = record.dynamodb.NewImage.timestamp.N;
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
        // console.log("%j",itemsArray);
    });

    if(itemsArray.length > 0){
      console.log("Pithre Length",itemsArray.length);
      if(itemsArray.length <= 25) {
        console.log("Items Length <= 25 so directly updating");
        var params = {
          RequestItems: {
            "kmm-stream" : itemsArray
          }
        };
        putDataToDB(params,callback);
      } else {
        console.log("Items Length > 25 so splitting");
        let arrsplit = splitArrayIntoChunks(itemsArray,25);
        arrsplit.forEach((e,i)=>{
          var params = {
            RequestItems: {
              "kmm-stream" : e
            }
          };
          //console.log("Array Iteration: ",i);
          putDataToDB(params,callback);
        });
      }
    } else {
        callback(null, "Nothing to process");
    }
};
