const fs = require('fs');
const path = require('path');
const moment = require('moment');

const file = path.join(__dirname,'2017-06-05-11.bk');

fs.readFile(file,(err,data)=>{
  // console.log(JSON.parse(data.toString()));
  let v = JSON.parse(data);
  v.forEach((e,i)=>{
    // console.log(e);
    if(i>0){
      let diff = parseInt(e/1000)-parseInt(v[i-1]/1000);
      if(diff > 4){
        let mp = moment(parseInt(v[i-1])).format('HH:mm:ss');
        let mn = moment(parseInt(e)).format('HH:mm:ss');
        console.log(v[i-1],e, diff, mp, mn)
        // console.log(v[i-1]);
        // console.log(e);
        // console.log(diff);
      }
    }
  });
});
