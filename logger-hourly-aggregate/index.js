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
      Key: 'aggregate/'+dstKey+'.agr',
      Body: data,
      ContentType: 'application/json'
  };
  console.log("PUT params",putParams);
  s3.putObject(putParams,(err,data)=>{
    if(err) console.log(err,err.stack);
    else console.log("Put object Success",data);
  });
};

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
        let bss = bs.split("z\n");
        let d = {
          "c1": [],
          "c2": [],
          "c3": [],
          "c4": [],
          "c5": [],
          "c6": []
        };

        bss.forEach((e,i)=> {
          let v = e.split(',');
          let ci = d[v[3]];
          // console.log("CI:",ci,":V3",v[3]);
          if(ci){
            let ener = v[6].slice('1');
            let tick = v[2].slice('2');
            let cha = v[3].slice('1');
            let ea = [v[1],tick,cha,ener];
            ci.push(ea);
            // console.log("EA:",ea);
          }
        });
        console.log("Channels grouped",d);
        let energyObj  = {};
        let energyCObj = [];
        Object.keys(d).forEach((e,i)=>{
          let energy = 0;
          let el = d[e].length;
          let lt = 0;
          let ft = 0;
          console.log("Channel:",d[e][2]," length", el);
          d[e].forEach((k,l)=> {
            if( l === 0 ) {
              ft = k[0];
            }
            if( l == (el-1) ) {
              lt = k[0];
            }
            let ep = parseInt(k[3]);
            if(isNaN(ep)) console.log("NaN:",k);
            energy+= isNaN(ep) ? 0: ep;
          });
          energyCObj.push({
            "channel": e.slice('1'),
            "energy": energy,
            "timestamp": [ft,lt],
            "records": el
          });
          console.log("ENERGY for channel: ", e, " is:",energy);
        });
        energyObj.channels = energyCObj;
        energyObj.total = bss.length;
        putObject(JSON.stringify(energyObj),objectKey);
        console.log("Energy Object: ",JSON.stringify(energyObj));
        console.log(bss.length," length ");
      }
    });
    callback(null, JSON.stringify("Success"));
};
