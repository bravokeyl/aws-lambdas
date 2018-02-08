'use strict';

const rp = require('request-promise');

const basePath = 'https://graph.facebook.com/';
const  appId = process.env.PAGE_ID;
const postPath = basePath+'/'+appId+'/feed';

const RohanPermanentToken = process.env.ACCESS_TOKEN;

const badrPermanentToken = process.env.BADRA_ACCESS_TOKEN;

const excludedKeys = [
  "email",
  "phone",
  "website",
  "address"
];
const isExcludedKey = (key) => {
  return excludedKeys.includes(key.toLowerCase());
};

const filteredKeys = (keys) => {
  return keys.filter(key => !isExcludedKey(key));
};

const constructMessage = ({params}) => {
  if(!params) return false;
  const { querystring } = params;
  if(!querystring) return false;
  let msg = "Hi Web Designer! \r\n";
  msg += "We got a new lead for you.\r\n \r\n";
  let keys = Object.keys(querystring);
  keys = filteredKeys(keys);
  keys.map((e)=>{
    let val = querystring[e];
    msg += `${e} : ${val}`;
    msg += "\r\n";
  });
  msg += "\r\nEmail/Cell: Click here to contact this lead: https://instaleads.co.za \r\n \r\n";
  msg += "\r\n \r\nRegards, \r\n";
  msg += "Rohan Rossouw \r\n";
  msg += "https://instaleads.co.za \r\n";
  return msg;
};

exports.handler = (event, context, cb) => {
  let message = constructMessage(event);
  if(message){
    // const actions =  [{
    // 	"name": "AWS - API Gateway",
    // 	"link": "https://bravokeyl.com/"
    // }];
    const rParams = {
      method: 'POST',
      uri: postPath,
      qs: {
        access_token: RohanPermanentToken,
        message: message,
        // actions: JSON.stringify(actions),
        // place: 'Hyderabad',
        link: "https://instaleads.co.za",
        // "og_action_type_id": "383634835006146",
        // "og_object_id": "136050896551329",
        // "og_icon_id": "609297155780549"
      },
      json: true,
    }
    let start = Date.now();
    let end;

    rp(rParams)
    .then(function (res) {
      console.log("Response:", res);
      end = Date.now();
      console.log("TIME TAKEN:", end-start);
      cb(null, res);
    })
    .catch(function (err) {
      console.log("Errored:", err);
      cb(err, null);
    });
  }
  console.log(message);
};
