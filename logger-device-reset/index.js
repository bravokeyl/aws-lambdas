/* eslint-disable no-console*/
/* eslint-disable */
const AWS = require('aws-sdk');
/* eslint-enable */

const moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  apiVersion: '2012-08-10',
});

const sns = new AWS.SNS();

const tableName = 'logger-devices';
const deviceId = 'esp8266_1ACD99';
exports.handler = (event, context, cb) => {
  console.log(event);
  const a = moment().format('x');
  console.log('Current timestamp', a);
  console.log('Date Query String', event);
  const params = {
    TableName: tableName,
    KeyConditionExpression: 'device = :deviceId and qtype = :viewType',
    ExpressionAttributeValues: {
      ':deviceId': deviceId,
      ':viewType': 'data',
    },
    Limit: 1,
  };
  docClient.query(params, (err, data) => {
    if (err) {
      console.error('Unable to read. Error JSON:', JSON.stringify(err, null, 2));
      cb(null, err);
    } else {
      console.log('Get succeeded:', JSON.stringify(data, null, 2));
      if (data && data.Items) {
        const items = data.Items;
        const rt = items[0].timestamp;
        const diff = a - rt;
        console.log('Diff time:', diff);
        if (parseInt(diff, 10) > 10000) {
          // SNS
          const sdata = {
            data: items,
            timestamp: rt,
          };
          const snsMsg = {
            "default": JSON.stringify(sdata),
            "lambda": JSON.stringify(sdata)
          };
          console.log('SNS Message:', snsMsg);
          const snsParams = {
            Message: JSON.stringify(snsMsg), /* required */
            MessageStructure: 'json',
            TopicArn: 'arn:aws:sns:us-east-1:839763603522:logger-alerts',
          };
          sns.publish(snsParams, (snsErr, snsRes) => {
            if (snsErr) console.log(snsErr, snsErr.stack);
            else console.log(snsRes);
          });
        }
      }
      cb(null, data);
    }
  });
};
