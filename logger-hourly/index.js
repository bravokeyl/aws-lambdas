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
const prefixBuck = process.env.S3_PREFIX;
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

const s3ListObjetsHour = (token) => {
  let nct = token || undefined;
  console.log("NCT",nct);
  let params = {
    Bucket: srcBucket, /* required */
    Prefix: prefixBuck, /* required */
    // ContinuationToken: '1ADpvqzapxbEW7QB3MvIm+xCUnndin2fFzSLrM13mSyW+lkvEbShoMnETlctD+b4fCbKO4hZgmckmbMiSdUKKAQ=='
  };

  if(nct) {
      params.ContinuationToken = nct;
  }
  console.log("Params",params);
  s3.listObjectsV2(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else{
      let tfiles = [];
      let truncated = data.IsTruncated;
      console.log(data.NextContinuationToken,"NCT", truncated, "Is truncated");
      nct = data.NextContinuationToken;

      data.Contents.forEach((e,i)=> {
        let key = e.Key.split('/');
        let f = key[key.length-1];
        let filename = f.split('.');
        let d = filename[0];
        let m = moment(parseInt(d));
        // console.log(e.Key,d,typeof d);
        let ist = m.utcOffset(330);
        let hkey = ist.format('YYYY/MM/DD/HH');
        tfiles[i] = {
          "prefix": hkey,
          "key": d
        }
        // console.log("UTC: ",m.format()," IST: ",ist.format('YYYY/MM/DD/HH')," Epoch ",moment().format('x'));
      }); // End loop
      // console.log(tfiles);
      let output = [];

      tfiles.forEach(function(value) {
        var existing = output.filter(function(v, i) {
          return v.prefix == value.prefix;
        });
        // console.log(existing);
        if (existing.length) {
          var existingIndex = output.indexOf(existing[0]);
          output[existingIndex].key = output[existingIndex].key.concat(value.key);
        } else {
          if (typeof value.key == 'string')
            value.key = [value.key];
          output.push(value);
        }
      }); // tfiles loop end

      console.log(output,"Length",output.length);
      let pparams = {
        Body: JSON.stringify(output),
        Bucket: 'logger-hourly',
        Key: 'bke'+Math.ceil(Math.random()*100000000)
      };
      s3.putObject(pparams, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      });
      if(truncated){
        s3ListObjetsHour(nct);
      }
    }
  });
};

const s3Copy = () => {
  let fo = [];
  fo.forEach((e)=>{
    let pre = e.prefix;
    e.key.forEach((l)=>{
      let ckey = "/engdata/"+prefixBuck+"/"+l+".json";
      console.log("Key:",ckey);
      let cparams = {
        Bucket: "logger-hourly",
        CopySource: ckey,
        Key: pre+"/"+l
      };
      s3.copyObject(cparams, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else     console.log(data);           // successful response
      });
    }); // end key loop
  });// end obj loop
}
exports.handler = (event, context, callback) => {
    console.log("Event:",event);
    console.log("S3 Env Bucket", process.env.S3_BUCKET)
    console.log("Pithre Bucket:",srcBucket," key:",prefixBuck);
    // s3.getObject( params,
    //   function(err, data) {
    //   if (err) console.log(err, err.stack);
    //   else {
    //     let bs = data.Body.toString();
    //     putObject(bs,objectKey);
    //   }
    // });
    let len = s3ListObjetsHour();
    // s3Copy();
    callback(null, JSON.stringify("Success"));
};
