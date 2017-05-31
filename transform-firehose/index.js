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
      ContentType: 'text/plain'
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
        let b = bs.split('}');
        let s3b = "Time,channel,V RMS,C RMS,V MOM,C MOM,V FUND,C FUND,V PERIOD,C PHASE SH,V SAG TIME,V SWELL TIME,C SWELL TIME,EN_ACT,EN_REACT,EN_APP,POW_ACT,POW_REACT,POW_APP,AHACC\n";
        b.forEach((be,j)=>{
          let l = be.replace(/{/g,'');
          l = l.replace(/"data":/g,'');
          l = l.replace(/"/g,'');
          l = l.replace(/z\\n/g,'zzn');
          l = l.split("zn");
          l.forEach((e,i)=>{
            if(e[0] == 'b') {
              console.log(e,"Extracted line, first char is:",e[0]);
              s3b += e+"\n";
            } else {
              console.log("First char is not 'b':",e[0])
            }
          });
        });
        console.log("Pithre Formatted Data:",s3b);
        putObject(s3b,objectKey);
      }
    });
    callback(null, JSON.stringify("Success"));
};
