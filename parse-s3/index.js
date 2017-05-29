'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const filePath = path.join(__dirname,'logger-esp-stream-3-2017-05-24-09-39-51-7b597e6d-1e71-4629-b1f9-9d844c437258')

console.log("Starting...");
const output = fs.createWriteStream("2.json");

const rl = readline.createInterface({
  input: fs.createReadStream(filePath)
});

rl.on('line', (line) => {
  let l = line.replace(/}/g,' ');
  l = l.replace(/{/g,' ');
  l = l.replace(/"data":/g,'');
  l = l.replace(/\\n/g,'');
  l = l.replace(/"/g,'');
  output.write(l.trim());
});
rl.on('close', () => {
  console.log("Closed");
});
