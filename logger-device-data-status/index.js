/* eslint-disable no-console*/
/* eslint-disable */
const AWS = require('aws-sdk');
/* eslint-enable */
const moment = require('moment');
// const s3 = new AWS.S3();
AWS.config.update({ region: 'us-east-1' });

// const dstBucket = process.env.S3_BUCKET;

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10',
});

const tableName = 'logger-devices';
exports.handler = (event, context, callback) => {
  console.log(event);
  // let dstKey = event.device || 'device-undefined'+Math.rand()*100000;
  // const putParams = {
  //     Bucket: dstBucket || 'logger-devices',
  //     Key: dstKey,
  //     Body: event.toString(),
  //     ContentType: 'application/json'
  // };
  // console.log("PUT params",putParams);
  // s3.putObject(putParams,(err,data)=>{
  //   if(err) console.log(err,err.stack);
  //   else console.log("Put object Success",data);
  // });
  // const device = event.device;
  // const timestamp = event.timestamp;
  const { device, timestamp } = event;
  // // const timestamp = new Date(parseInt(utime, 10));
  const deviceId = `${device}-data`;
  const UTCtime = moment(timestamp).format('YYYY-MM-DD HH:mm:ss');
  const ISTtime = moment(timestamp).utcOffset(330).format('YYYY-MM-DD HH:mm:ss');
  const item = {
    device: deviceId,
    type: 'data',
    timestamp,
    UTCtime,
    ISTtime,
  };

  const dbPutParams = {
    TableName: tableName,
    Item: item,
  };

  console.log('PUT params', dbPutParams);
  docClient.put(dbPutParams, (err, res) => {
    if (err) {
      console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      callback(err, null);
    } else {
      console.log('UpdateItem succeeded:', JSON.stringify(res, null, 2));
      callback(null, 'Successfully processed records.');
    }
  });
  callback(null, `Successfully processed ${event} records.`);
};
