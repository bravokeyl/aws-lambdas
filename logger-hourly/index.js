'use strict';
const AWS = require('aws-sdk');
const moment = require('moment');
const s3 = new AWS.S3();

AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});
const srcBucket = process.env.S3_BUCKET;
const dstBucket = 'logger-hourly';
const putObject = function(data,dstKey) {
  const putParams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: data,
      ContentType: 'text/plain'
  };
  s3.putObject(putParams,(err,data)=>{
    if(err) console.log(err,err.stack);
    console.log("Put object Success",data);
  });
};

const s3ListObjetsHour = () => {
  let params = {
    Bucket: srcBucket, /* required */
    Prefix: 'esp/bad/esp8266_1645EF', /* required */
  };
  s3.listObjectsV2(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else{
      data.Contents.forEach((e,i)=> {
        let key = e.Key.split('/');
        let f = key[key.length-1];
        let filename = f.split('.');
        let d = filename[0];
        let m = moment(parseInt(d));
        // console.log(e.Key,d,typeof d);
        console.log("UTC: ",m.format()," IST: ",m.utcOffset(330).format()," Epoch ",moment().format('x'));
      })
    }
  });
};

exports.handler = (event, context, callback) => {
    console.log("Event:",event);
    console.log("S3 Env Bucket", process.env.S3_BUCKET)
    let bucketName = 'engdata';
    let objectKey = '';
    console.log("Pithre Bucket:",bucketName," key:",objectKey);
    // s3.getObject( params,
    //   function(err, data) {
    //   if (err) console.log(err, err.stack);
    //   else {
    //     let bs = data.Body.toString();
    //     putObject(bs,objectKey);
    //   }
    // });
    s3ListObjetsHour();
    callback(null, JSON.stringify("Success"));
};
