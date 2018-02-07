#!/bin/bash

# Usage ./hr 1 // 1 is the date
if [ $# -eq 0 ];
then
 echo "No date given"
 exit 1
fi

if [ $1 -lt 1 ] || [ $1 -gt 31 ]
then
  echo "Date must be between 0 and 32";
  exit 1
else
  d=$(printf "%02d\n" "${1#0}");
  echo $d
fi

for hr in {00..10}
do
  for c in {1,2,3,4,5,6}
  do
    d=$(printf "%02d\n" "${1#0}");
    dat='2018/02/'${d}
    echo $dat
    pay='{"params":{"querystring":{"ddt":"';
    a='/'$hr'",';
    c='"c":"'$c;
    d='"}}}';
    b=$pay"${dat}"$a$c$d
    echo $b
    aws lambda invoke --function-name kmm-power:esp8266_1ACD99 --payload $b "a.json" --profile luser --no-verify-ssl
    echo " "
    read -p "Continuing in 2 Seconds...." -t 2
    echo "Continuing ...."
  done
done
exit 0
