/* eslint-disable no-console*/
/* eslint-disable */
const AWS = require('aws-sdk');
/* eslint-enable */
const s3 = new AWS.S3();
const moment = require('moment');

const ses = new AWS.SES({
  apiVersion: '2010-12-01',
});

exports.handler = (event, context, cb) => {
  const a = moment().format('x');
  console.log('Current timestamp', a);
  console.log(event.Records[0].Sns);
  let msg = 'default text';
  if (event && event.Records) {
    const snsMsg = event.Records[0].Sns.Message;
    msg = JSON.parse(snsMsg).data;
    console.log('SNS:', msg);
  }

  s3.getObject({
    Bucket: 'logger-alerts',
    Key: 'preset.html',
  }, (err, data) => {
    if (err) {
        // Error
      console.log(err, err.stack);
      cb(null, 'Internal Error: Failed to load template from s3.');
    } else {
      const templateBody = data.Body.toString();
      console.log('Template Body: ', templateBody);
    }
  });

  const sesParams = {
    Destination: {
      ToAddresses: [
        'iragam.bhadra@gmail.com',
      ],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: JSON.stringify(msg),
        },
        Text: {
          Charset: 'UTF-8',
          Data: JSON.stringify(msg),
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Connection issue with ESP',
      },
    },
    Source: 'admin@blufieldsenergy.com',
  };
  ses.sendEmail(sesParams, (error, res) => {
    if (error) console.log(error, error.stack);
    else console.log(res);
  });
  cb(null, 'Finished');
};
