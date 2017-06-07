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
// const todayDate = moment().utcOffset(330).format('YYYY/MM/DD');

const formattoExcel = (bs,objectKey) => {
  let b = bs.split('}');
  let s3b = "Device,Timestamp,Ticks,Channel,V RMS,C RMS,Energy Active,Power Active,V MOM,C MOM,V FUND,C FUND,V PERIOD,C PHASE SH,V SAG TIME,V SWELL TIME,C SWELL TIME,EN_REACT,EN_APP,POW_REACT,POW_APP,AHACCz\n";
  b.forEach((be,j)=>{
    let l = be.replace(/{/g,'');
    l = l.replace(/"data":/g,'');
    l = l.replace(/"/g,'');
    l = l.replace(/z\\n/g,'zzn');
    l = l.split("zn");
    let s3tm = [];

    l.forEach((e,i)=>{
      if(e[0] == 'b') {
        // console.log(e,"Extracted line, first char is:",e[0]);
        s3tm.push(e+"\n");
      } else {
        let ptimestamp,pdevice;
        // console.log("First char is not 'b': Record is: ",e);
        let ps = e.split(',');
        if(ps[1]) {
          ptimestamp = ps[1].split(':');
          ptimestamp = ptimestamp[1] || null;
        }
        if(ps[2]) {
          pdevice = ps[2].split(':');
          pdevice = pdevice[1] || null;
        }
        s3tm.forEach((se,si)=>{
          s3tm[si] = pdevice+","+ptimestamp+","+se;
          s3b += s3tm[si];
          // console.log("Line with timestamp and device",s3tm[si])
        });
        // console.log("Accumulated data:",s3tm);
        s3tm = [];
      }
    }); // row each end
  }); // first loop
  putObject(s3b,objectKey);
  console.log("Pithre Formatted Data:",s3b);
}

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
        let pbs = JSON.parse(bs);
        let apb = '';
        console.log("Length:",bs.length,"Length: ",pbs.length," Type:",typeof pbs);
        console.log(pbs);
        console.log(pbs[3]);
        let pbslen = pbs.length;
        pbs.forEach((p,pi)=> {
          const appendParams = {
              Bucket: srcBucket,
              Key: p
          };
          s3.getObject(appendParams,(err,data)=>{
            if(err) console.log(err,err.stack);
            else {
              let sb = data.Body.toString();
              apb += sb;
              // console.log("Body length:",sb.length," Append length:",apb.length);
              if( pi == (pbslen-1) ) {
                let formattedDa = formattoExcel(apb,objectKey);
                console.log("Total Body",apb);
              }
            }
          });

        });
        console.log(apb,"APB");
      }
    });
    callback(null, JSON.stringify("Success"));
};
