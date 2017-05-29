'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const filePath = path.join(__dirname,'2.json')

let dataArr = [];
console.log("Starting...");
fs.readFile(filePath,'utf8',(err,data) => {
  console.log(data.length, typeof data);
  dataArr = data.split('e');
  console.log(dataArr.length);
  // dataArr.forEach((e,i) => {
  //   console.log(e.length,i);
  // })
})
console.log("DATA1:",dataArr);
// let data = fs.readFileSync(filePath,'utf8')
// console.log("DATA2:",data);
