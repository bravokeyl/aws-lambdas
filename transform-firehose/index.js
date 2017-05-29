'use strict';
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
AWS.config.update({region: 'us-east-1'});
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10'
});
const dstBucket = 'tengdata';
const putObject = function(data,dstKey) {
  const putParams = {
      Bucket: dstBucket,
      Key: dstKey,
      Body: data,
      ContentType: 'application/json'
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
        let b = data.Body.toString();
        let l = b.replace(/}/g,' ');
        l = l.replace(/{/g,' ');
        l = l.replace(/"data":/g,'');
        l = l.replace(/\\n/g,'');
        l = l.replace(/"/g,'');
        l = l.split('e');
        console.log("Pithre Formatted Data:",l);
        putObject(JSON.stringify(l),objectKey);
      }
    });
    callback(null, JSON.stringify("Success"));
};
