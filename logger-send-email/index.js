/* eslint-disable no-console*/
/* eslint-disable */
const AWS = require('aws-sdk');
/* eslint-enable */

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
