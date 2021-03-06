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

const voltageLowerLimit = 100;
const voltageUpperLimit = 400;
const powerLowerLimit = 5;
const currentLowerLimit = 0.1;

let dataAfterReset = {
  "1": [0],
  "2": [0],
  "3": [0],
  "4": [0],
  "5": [0],
  "6": [0]
};

const logLevels = {error: 4, warn: 3, info: 2, verbose: 1, debug: 0};
function bklog(logLevel, statement) {
    if(logLevels[logLevel] >= logLevels[currLogLevel] ) {
        console.log(statement);
    }
}

function isSunHour(hr){
  if(6<Number(hr) && Number(hr)<18) {
    return true;
  }
  return false;
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
          "R": en.R,
          "Y": en.Y,
          "B": en.B,
          "i1": en.i1,
          "i2": en.i2,
          "i3": en.i3,
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
    // Power threshold
    if(d[index].energy && d[index].energy>0 && d[index].power && d[index].power > powerLowerLimit) {
      if((d[index].energy-start) > 0 && (d[index].energy-start) < 2.4) {
        console.log("End Defined ticks:",d[index].ticks);
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
function checkVoltage(r) {
  if(voltageLowerLimit < r.voltage && r.voltage < voltageUpperLimit) {
    return true;
  }
  return false;
}
function checkPower(r) {
  if(r.power > powerLowerLimit) {
    return true;
  }
  return false;
}
function checkCurrent(r) {
  if(r.current >= currentLowerLimit) {
    return true;
  }
  return false;
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
      if(initialEnergy && initialEnergy > 0 && initialPower && initialPower > powerLowerLimit) {
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
            let hourEnergy = parseFloat(d[i-1].energy-initialEnergy).toFixed(6);
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
      db = isNaN(db) ? 0 : Number(parseFloat(db).toFixed(6));
      o.push(db);
    }
  });
  return o;
}
function checkReset(d,c){
  let dar = [0];
  d.forEach((e,i)=>{
    let {energy,channel,power,voltage,current,timestamp,ticks} = e;
    if(i> 0 && ticks){
      let prev = d[i-1].ticks;
      let next = ticks;
      if(!isNaN(Number(prev)) && !isNaN(Number(next))){
        if(next-prev < 0){
          console.log("Reset happened - last energy value: ",d[i-1].energy);
          dar.push(i-1);
          if(dataAfterReset[channel]){
            dataAfterReset[channel].push((i-1));
          } else {
            bklog("error","Wrong channel or no channel");
          }
        }
      }
    }
  });
  dar.push(d.length);
  return dar;
}
function hourEnergy(d,c) {
  let cdata = c;
  let gotInitialEnergy = false;
  let initialEnergy = 0;
  let finalEnergy = 0;
  let o = [];
  let clength = cdata.length;
  for(let ci=1;ci<=clength;ci++){
    let si = cdata[ci-1];
    if(si>0) {
      si = si+1;
    }
    gotInitialEnergy = false;
    for(let i=si;i<cdata[ci];i++){
      let e = d[i];
      if(e){
        let {energy,channel,power,voltage,current,timestamp,ticks} = e;
        //Check voltage,power,current limits
        if(checkVoltage(e) && checkPower(e) && checkCurrent(e)){
          if(!gotInitialEnergy) {
            initialEnergy = energy;
            gotInitialEnergy = true;
            bklog("error","Initial Energy: "+JSON.stringify(energy)+" : ticks : "+JSON.stringify(ticks));
          }
          finalEnergy = energy;
          o[ci-1] = Number(parseFloat(finalEnergy-initialEnergy).toFixed(6));
        } else {
          bklog("debug","Didn't pass checks for channel:"+JSON.stringify(channel)+" at "+JSON.stringify(timestamp));
        }
      } else {
        // console.log(si,cdata[ci],"DKDKDKKD",i,e);
      }
    }
  }

  return o;
}
function getHourEnergy(items,c) {
  let he = 0;
  // let he = checkDataReset(items);
  let dar = checkReset(items,c);
  console.log("RESET ARR",dar,c);
  he = hourEnergy(items,dar);
  return he;
}
function getAppEnDefined(data,index,order,i,f){
  console.log(index,order,data[index].ticks,data[index].q);
  let appEn = Number(data[index].apparentEnergy);
  let appPow = Number(data[index].apparentPower);
  if(index >= i && index <= f  ){
    if(appEn && !isNaN(appEn) && Number(appEn) >= 0 && appPow && !isNaN(appPow)){
      return Number(data[index].apparentEnergy);
    }
    else {
      return getAppEnDefined(data,index+order,order,i,f);
    }
  }
  return 0;
}
function appEnergy(data,channel){
  let appEnergy = [];
  let len  = data.Items.length;
  if(len){
     let dar = checkReset(data.Items,channel);
     console.log("APP EN Reset:",dar,"Channel:",channel);
     let p,c;
     if(dar.length === 2){
       c = dar[1]-1;
       p = dar[0];
       let curr = data.Items[c].apparentEnergy;
       let prev = data.Items[p].apparentEnergy;
       let curAppPower = Number(data.Items[c].apparentPower);
       let preAppPower = Number(data.Items[p].apparentPower);
       if(isNaN(curr) || isNaN(curAppPower)){
         curr = getAppEnDefined(data.Items,c-1,-1,1,dar[1]-1);
         // curr = Number(data.Items[c-1].apparentEnergy);
         // curAppPower = Number(data.Items[c-1].apparentPower);
       }
       if(isNaN(prev) || isNaN(preAppPower)){
         prev = getAppEnDefined(data.Items,p,1,1,dar[1]-1);
         // prev = Number(data.Items[p+1].apparentEnergy);
         // preAppPower = Number(data.Items[p+1].apparentPower);
       }
       if( curr && prev ){
         let aen = Number(parseFloat(curr - prev).toFixed(3));
         if(!isNaN(aen)){
           console.log("CurR En:",curr,"PreV En:",prev);
           appEnergy.push(aen);
         }
       }
     } else {
       console.log("RESET APPARENT");
       for(let i=1,s=1;i<dar.length;i++,s++){
         if(i>1){
           s = s+1;
         }
         c = dar[i];
         p = dar[s-1];
         if(c == len ) {
           c = dar[i]-1;
           p = dar[i-1]+1;
         }
         // console.log("Curr:",channel,data.Items[c],c,i,dar,data.Items.length);
         // console.log("Prev:",channel,data.Items[p],p,s-1,dar,data.Items.length);
         let curr = data.Items[c].apparentEnergy;
         let prev = data.Items[p].apparentEnergy;
         let curAppPower = Number(data.Items[c].apparentPower);
         let preAppPower = Number(data.Items[p].apparentPower);

         if( curr && prev && curAppPower && preAppPower){
           let aen = Number(parseFloat(curr - prev).toFixed(3));
           if(!isNaN(aen)){
             console.log("CurR En:",curr,"PreV En:",prev);
             console.log("CurR ApPow:",curAppPower,"PreV ApPow:",preAppPower);
             console.log("DIFFED:",data.Items[p],data.Items[c])
             appEnergy.push(aen);
           }
         }
       }
     }
  }
  console.log("APP EN:",appEnergy,channel);
  let appEnergyOut = 0;
  if(appEnergy.length>=1){
    appEnergyOut = appEnergy.reduce( (prev, curr) => prev + curr );
  }
  return Number(parseFloat(appEnergyOut).toFixed(3));
}
function processData(data,c) {
    let updatedAt = 0;
    let reslength = 0;
    let hourEnergy = [0];
    console.log("Channel: ",c);
    if(data.Items){
      reslength = data.Items.length;
      console.log("Length: ",reslength);
    }
    if( reslength > 0) {
      hourEnergy = getHourEnergy(data.Items,c);
      console.log("hourEnergy",hourEnergy,"Channel:",c)
      updatedAt = data.Items[reslength-1].timestamp || 0;
      // console.log("updatedAt: ",updatedAt);
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
    let loadArr = [
      getChannelData(2,st,limit,cc),
      getChannelData(4,st,limit,cc),
      getChannelData(6,st,limit,cc)
    ];
    let solarArr = [
      getChannelData(1,st,limit,cc),
      getChannelData(3,st,limit,cc),
      getChannelData(5,st,limit,cc)
    ];
    let promisesArr = loadArr;
    let checkhr = st.split('/').reverse();
    if(isSunHour(checkhr[0])){
      promisesArr = loadArr.concat(solarArr);
    }
    Promise.all(promisesArr)
    .then(function(allData) {
        let edata = allData;
        let c1,c3,c5,R,Y,B,i1,i2,i3;
        c1 = c3 = c5 = {
          hourEnergy: 0
        };
        let c2 = processData(allData[0],2);
        let c4 = processData(allData[1],4);
        let c6 = processData(allData[2],6);
        R = appEnergy(allData[0],2);
        Y = appEnergy(allData[1],4);
        B = appEnergy(allData[2],6);
        // console.log("R:",R,"Y:",Y,"B:",B);

        if(isSunHour(checkhr[0])){
          console.log("A sun hour")
          c1 = processData(allData[3],1);
          c3 = processData(allData[4],3);
          c5 = processData(allData[5],5);
          i1 = appEnergy(allData[3],1);
          i2 = appEnergy(allData[4],3);
          i3 = appEnergy(allData[5],5);
        } else {
          console.log("Not a sun hour")
          c1 = c3 = c5 = {
            hourEnergy: [0]
          }
          i1 = i2 = i3 = 0;
        }
        let updatedAt = c2.updatedAt;
        let hourEnergy = {
          e1: c1.hourEnergy,
          e2: c2.hourEnergy,
          e3: c3.hourEnergy,
          e4: c4.hourEnergy,
          e5: c5.hourEnergy,
          e6: c6.hourEnergy,
          "R": isNaN(R)? 0:R,
          "Y": isNaN(Y)? 0:Y,
          "B": isNaN(B)? 0:B,
          "i1": isNaN(i1)? 0:i1,
          "i2": isNaN(i2)? 0:i2,
          "i3": isNaN(i3)? 0:i3,
        }
        let reslength = allData[0].Items.length;
        // console.log("Data split after reset (if any):",dataAfterReset);
        // console.log("Final Output:",c1,c2,c3,c4,c5,c6);
        // console.log("Data to DB:",hourEnergy);
        putDataToDB(hourEnergy,device,st,updatedAt,reslength);
    })
    .catch(function(err){
      console.log(err.stack);
    });
};
