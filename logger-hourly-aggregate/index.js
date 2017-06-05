'use strict';
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});

const srcBucket = process.env.S3_SRC_BUCKET;
const dstBucket = process.env.S3_DST_BUCKET;
const s3DeviceId = process.env.DEVICE_ID; // TODO: get this by lisiting objectsv2 S3

const putObject = function(data,dstKey) {
  const putParams = {
      Bucket: dstBucket,
      Key: 'merged/'+dstKey+'.xls',
      Body: data,
      ContentType: 'application/vnd.ms-excel'
  };
  s3.putObject(putParams,(err,data)=>{
    if(err) console.log(err,err.stack);
    console.log("Put object Success",data);
  });
}

exports.handler = (event, context, callback) => {
    console.log("Event:",event);
    let bucketName = event.Records[0].s3.bucket.name;
    let objectKey = event.Records[0].s3.object.key;
    console.log("Pithre Bucket:",bucketName," key:",objectKey);
    let params = {
      Bucket: bucketName,
      Key: objectKey
    };
    s3.getObject( params,
      function(err, data) {
      if (err) console.log(err, err.stack);
      else {
        let bs = data.Body.toString();
        console.log(bs);
      }
    });
    callback(null, JSON.stringify("Success"));
};
