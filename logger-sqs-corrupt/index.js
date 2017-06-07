'use strict';

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

const QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/839763603522/logger-sqs-corrupt';
const sqs = new AWS.SQS({region : 'us-east-1'});

function isPartial(message) {
  let messageLength = message.length;
  let firstChar = message.charAt(0);
  let lastChar  = message.charAt(messageLength-2); //excluding "\n" newline
  let ret = {
    state: true,
    message: []
  };
  if(firstChar != 'b') {
    ret = {
      state: false,
      message: ['Message is not starting with character b']
    };
  }
  if(lastChar != 'z') {
    ret.state = false;
    ret.message.push('Message is not ending with character z');
  }
  return ret;
}

function splitB(message){
  let b = message.split("b");
  return b;
}

function checkLength(msgArr){
  let data = false;
  msgArr.forEach( (e,i) => {

    if(e.length > 0 ) {
      let p = e.split(',');
      console.log(p.length,"Length");
      if(p.length != 20) {
        data = true;
      }
    } // Length mismatch
  });
  return data;
}
function sqsMessage(msg) {
  const sqsparams = {
    MessageBody: JSON.stringify(msg),
    QueueUrl: QUEUE_URL
  };
  sqs.sendMessage(sqsparams, function(err,data){
    if(err) {
      console.log('Error:',err);
    } else{
      console.log('data:',data.MessageId);
    }
  });
}

exports.handler = (event, context, callback) => {
    let data = event.data;
    let timestamp = event.timestamp || 0;
    let deviceId = event.device || 'deviceId';
    console.log("Event:",event);
    let result=[];
    let isPartialMessage = isPartial(data);
    if(isPartialMessage.state){
      let splitAtB = splitB(data);
      let corrupted = checkLength(splitAtB);
      if(corrupted) {
        sqsMessage(event);
      }
    } else {
      // Add partial messages to SQS
      sqsMessage(event);
    } // end else

    callback(null, JSON.stringify(result));
};
