'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const iotdata = new AWS.IotData({endpoint: 'a2l7morab4hda0.iot.us-east-1.amazonaws.com'});
function payload() {
  let message;
  message="b";
  message = message+Math.random()+","+Math.random()+","+Math.random()+","+Math.random();
  message = message+"e";
  message = message+"b"+Math.random()+","+Math.random()+","+Math.random()+","+Math.random();
  message = message+"e";
  if(Math.ceil(Math.random()*10) >= 5){
    message = message+"b"+Math.random()+","+Math.random();
  }
  return JSON.stringify({ "data": message }); //Stringify message otherwise IoT lambda rule doesn't invoke the function
}
function pub(){
  console.log("start");
  var params = {
    topic: 'my/bad/d', /* required */
    payload: payload(),
    qos: 1
  };
  iotdata.publish(params, function(err, data) {
    console.log(params,"Inside");
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
  console.log("end");
}

//setInterval(pub,1000);
exports.handler = (event, context, callback) => {
  pub();
  callback(null, 'IoT published data');
};
