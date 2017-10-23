/* eslint-disable no-console*/
/* eslint-disable */
const AWS=require('aws-sdk');
/* eslint-enable */

const iotdata = new AWS.IotData({ endpoint: 'a2l7morab4hda0.iot.us-east-1.amazonaws.com' });

let shadowDocument = {
  led: 1,
  p4: 1,
  p5: 0,
};

const updateState = (evpar) => {
  console.log(shadowDocument, 'Before');
  if (evpar) {
    const { l, p4, p5 } = evpar;
    shadowDocument.led = (l === 'on') ? 1 : 0;
    shadowDocument.p4 = (p4 === 'on') ? 1 : 0;
    shadowDocument.p5 = (p5 === 'on') ? 1 : 0;
  } else {
    //
  }
  console.log(shadowDocument, 'After');
  return shadowDocument;
};

exports.handler = (event, context, cb) => {
  let state;
  let thingName;
  let update;
  let us = false;
  console.log(event);
  if (event && event.params) {
    if (event.params.path && event.params.path.deviceId) {
      thingName = event.params.path.deviceId;
    } else {
      cb(null, { message: 'Required thing name' });
    }
    const ep = event.params.querystring;
    if (ep && (ep.l || ep.p4 || ep.p5)) {
      update = updateState(ep);
      us = true;
    }
  }
  const ns = {
    state: {
      desired: update,
    },
  };
  const params = {
    thingName,
    payload: JSON.stringify(ns),
  };
  if (us) {
    console.log('Updating shadow with state:', update, params);
    iotdata.updateThingShadow(params, (err, data) => {
      if (err) console.log(err, err.stack);
      else {
        cb(null, JSON.parse(data.payload));
        console.log(data);
      }
    });
  } else {
    cb(null, { message: 'Set state through state query string' });
  }
};
