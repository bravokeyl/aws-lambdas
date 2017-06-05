'use strict';
const AWS = require('aws-sdk');
const moment = require('moment');
const s3 = new AWS.S3();

AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const srcBucket = process.env.S3_SRC_BUCKET;
const dstBucket = process.env.S3_DST_BUCKET;
const s3DeviceId = process.env.DEVICE_ID; // TODO: get this by lisiting objectsv2 S3
const todayDate = moment().utcOffset(330).format('YYYY/MM/DD');

const prefixBuck = s3DeviceId+"/"+todayDate;

const makeTwoDigits = (d) => {
  if(d>9){
    return d;
  }
  else {
    d = "0"+d;
  }
  return d;
}

const s3ListObjetsHour = (token) => {
  let nct = token || undefined;
  console.log("NCT",nct);
  let params = {
    Bucket: srcBucket, /* required */
    Prefix: prefixBuck, /* required */
  };

  let dbData = [];
  let hh = moment().utcOffset(270).format('HH'); // 330mins-60mins
  params.Prefix = prefixBuck+"/"+hh
  if(nct) {
      params.ContinuationToken = nct;
  }
  console.log("Params",params);
  s3.listObjectsV2(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else{
      let tfiles = [];
      let dbfiles = [];
      let diffObj = [];
      let dateHr;
      let dbDateHr;
      let truncated = data.IsTruncated;
      // console.log(data.NextContinuationToken,"NCT", truncated, "Is truncated");
      nct = data.NextContinuationToken;
      console.log("Data:",data);
      let size = 0;
      data.Contents.forEach((e,i)=> {
        let key = e.Key;
        let f = key.split('/');
        let filename = f[f.length-1];
        tfiles[i] = key;
        dbfiles[i] = filename;
        if(i>0) {
          let diff = parseInt(filename/1000)-parseInt(dbfiles[i-1]/1000);
          let mp = moment(parseInt(dbfiles[i-1]));
          let mn = moment(parseInt(filename));
          if(diff > 4) {
            diffObj.push({
              "p": { 'ist': mp.utcOffset(270).format('YYYY-MM-DD HH:mm:ss'),'u': parseInt(dbfiles[i-1])},
              "n": { 'ist': mn.utcOffset(270).format('YYYY-MM-DD HH:mm:ss'),'u': parseInt(filename)},
              "d": diff
            });
          }
        }
        size += e.Size;
      }); // End loop
      // console.log(tfiles);
      console.log("Diff Obj:",diffObj);
      dateHr = moment().utcOffset(270).format('YYYY-MM-DD')+"-"+hh;
      dbDateHr = moment().utcOffset(270).format('YYYY/MM/DD');
      let pparams = {
        Body: JSON.stringify(tfiles),
        Bucket: dstBucket,
        Key: s3DeviceId+'/'+dbDateHr+"/"+dateHr
      };
      s3.putObject(pparams, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });
      let diffparams = {
        Body: JSON.stringify(diffObj),
        Bucket: dstBucket,
        Key: s3DeviceId+'/'+dbDateHr+"/"+dateHr+"-diff"
      };
      s3.putObject(diffparams, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });
      var dbparams = {
          TableName: 'logger-hourly',
          Item:{
              "deviceId": s3DeviceId,
              "dateHr": moment().utcOffset(270).format('YYYY/MM/DD/HH'),
              "size": size,
              "objects": dbfiles.length,
              "data": JSON.stringify(dbfiles),
          }
      };

      docClient.put(dbparams, function(err, data) {
          if (err) {
              console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
          } else {
              console.log("Added item:", JSON.stringify(data, null, 2));
          }
      });
      if(truncated){
        // s3ListObjetsHour(nct);
      }
    }
  });// listObjectsV2 end

};

exports.handler = (event, context, callback) => {
    console.log("Event:",event);
    console.log("Pithre: src Bucket:",srcBucket, "dst Bucket:", dstBucket);
    console.log("Pithre: today prefix:", prefixBuck);
    let len = s3ListObjetsHour();
    callback(null, JSON.stringify("Success"));
};
