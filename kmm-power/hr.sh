#!/bin/bash
for number in 22
do
  dat='2018/01/'$number
  echo $dat
  pay='{"params":{"querystring":{"ddt":"';
  a='/'$2'",';
  c='"c":"'$1;
  d='"}}}';
  b=$pay"${dat}"$a$c$d
  echo $b
  aws lambda invoke --function-name kmm-power --payload $b "a.json" --profile luser --no-verify-ssl
  echo " "
  read -p "Continuing in 5 Seconds...." -t 5
  echo "Continuing ...."
done
exit 0
