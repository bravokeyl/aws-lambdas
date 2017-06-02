'use strict';
const AWS = require('aws-sdk');
const moment = require('moment');
const s3 = new AWS.S3();

AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const dstBucket = process.env.S3_BUCKET;

const putObject = function(data,dstKey) {
  console.log(data,"Check",JSON.stringify(data));
  const putParams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: JSON.stringify(data),
      ContentType: 'text/plain'
  };
  s3.putObject(putParams,(err,data)=>{
    if(err) console.log(err,err.stack);
    console.log("Put object Success",data);
  });
};

exports.handler = (event, context, callback) => {
    let data = event.data;
    let timestamp = event.timestamp || 0;
    let deviceId = event.device || 'deviceId';
    console.log("Event:",event);
    console.log("S3 Env Bucket", process.env.S3_BUCKET);
    let m = moment(parseInt(timestamp));
    let ist = m.utcOffset(330);
    let hkey = ist.format('YYYY/MM/DD/HH');
    let dstKey = deviceId+"/"+hkey+'/'+timestamp;
    putObject(event,dstKey);
    callback(null, JSON.stringify("Success"));
};
