'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const tableName = 'iot-esp';

function popuateItems(data,index){
  let itemsArray = [];
  console.log("Data:",data,data.length);
  for(let i=0;i<(data.length);i++) {
    let datum = data[i];
    if(datum){
      let item = {
        PutRequest: {
          Item: datum
        }
      };
      if(item){
        itemsArray.push(item);
      }
      console.log("Item:",item);
    }
  }

  return itemsArray;
}

function populateData(index,m) {
  let ind = index;
  let d = new Date();
  let date = d.getTime();
  let time = d.toLocaleTimeString("en-GB");
  let data = [];
  let channels = [];

  for(let i=0;i<(m.length);i++) {
    let deviceId = m[i].device;
    let channel = m[i].channel;
    let powac = m[i].power;
    let enac = m[i].energy;
    let vol = m[i].voltage;
    let cur = m[i].current;
    let timestamp = m[i].utime;
    let raw = m[i].raw;
    let ticks = m[i].ticks || 0;
    let inc = channels.indexOf(channel);
    let modifiedDuplicateTime = false;
    if( inc !=  -1) {
      console.log("DUPLICATE channel:",channel,"Removing it from data array found at", inc, " position");
      if( data[inc].ticks != ticks ) {
        console.log("Changing timestamp for the dup data");
        data[inc].timestamp = timestamp-4000;
        data[inc].modifiedDuplicateTime = true;
      } else {
        let dp = data.splice(inc,1);
        console.log("Data after removal:",data,"DP item", data[inc]);
      }
    } else {
      channels[i] = channel;
    }

    data[i] = {
      host: channel.toString(),
      utime: timestamp,
      deviceId: deviceId,
      raw: raw,
      channel: channel,
      date: d.toLocaleDateString(),
      time: time,
      powac: powac,
      enac: enac,
      vrms: vol,
      crms: cur,
      ticks: ticks
    }

  } // end for each
  console.log("Before Data:",data,data.length);
  let params = {
    RequestItems: {
       "iot-esp": popuateItems(data,ind)
     }
  };

  return params;
}

function putDataToDB(data){
  let dl = data.length;
  if(dl > 0){
    let params = populateData(1,data);

    docClient.batchWrite(params,function(err,data){
      if(err){
        console.log(JSON.stringify(err, null, 2));
        return err;
      } else {
        console.log("Data:",data);
        return data;
      }
    });
  }
  return;
}

function isPartial(message) {
  let messageLength = message.length;
  let firstChar = message.charAt(0);
  let lastChar  = message.charAt(messageLength-2); //excluding "\n" newline
  let ret = {
    state: true,
    message: []
  };
  if(firstChar != 'b') {
    ret = {
      state: false,
      message: ['Message is not starting with character b']
    };
  }
  if(lastChar != 'z') {
    ret.state = false;
    ret.message.push('Message is not ending with character z');
  }
  return ret;
}

function splitB(message){
  let b = message.split("b");
  return b;
}

function extractData(msgArr, timestamp, deviceId){
  let data = [];
  msgArr.forEach( (e,i) => {
    let c,pow,en,v,irms,ticks;
    if(e.length > 0) {
      let d = e.split(',');
      ticks = d[0];
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
          case 't':
            ticks = p.slice(1);
            break;
          default:
        }
      });
      data.push({
        "device": deviceId,
        "channel": c,
        "utime": timestamp,
        "energy": en,
        "power": pow,
        "current": irms,
        "voltage": v,
        "ticks": ticks,
        "raw": e
      });
      // console.log(data,"Extracting...");
    } // Records only with length > 0
  });

  return data;
}

exports.handler = (event, context, callback) => {
    let data = event.data;
    let timestamp = event.timestamp || 0;
    let deviceId = event.device || 'deviceId';
    console.log("Event:",event);
    let result=[];
    let isPartialMessage = isPartial(data);
    // if(typeof data == 'string' && data.length > 0){
    //     if(data.indexOf('b') != -1) {
    //       let m = data.split('b');
    //       console.log(m);
    //       if(m.length > 0){
    //         m.forEach((e,i)=>{
    //             let r = e.indexOf("z\n");
    //             if( e.length > 0 ){
    //                 // if(e.length == r+2){
    //                   let c = e.split("z\n");
    //                   c.forEach((d,j)=>{
    //                       if(d.length>0){
    //                          let req = d.split(',');
    //                          let reqlen = req.length;
    //                          console.log("Length:",reqlen,"Channel",req[1]);
    //                          if( (20 == reqlen)){
    //                            result.push(d);
    //                            console.log("Pit:",d)
    //                          }
    //                       }
    //                   });
    //                 // }
    //             }
    //         });
    //       }
    //     }// message starts with b
    // } // end parsing
    if(isPartialMessage.state){
      let splitAtB = splitB(data);
      let extractedData = extractData(splitAtB,timestamp,deviceId);
      console.log(extractedData);
      let res = putDataToDB(extractedData);
    } else {
      // Add partial messages to SQS
    }
    console.log('Partial Message:', isPartialMessage, timestamp);
    console.log(result);

    // let res = putDataToDB(result);
    callback(null, JSON.stringify(result));
};
