const Consumer = require('sqs-consumer');
const AWS = require('aws-sdk');
AWS.config.update({
  region: 'eu-east-1',
});
const app = Consumer.create({
  queueUrl: 'https://sqs.us-east-1.amazonaws.com/839763603522/logger-esp-sqs',
  handleMessage: (message, done) => {
    console.log(message.Body);
    // done();
  }
});

app.on('error', (err) => {
  console.log(err.message);
});

app.start();
