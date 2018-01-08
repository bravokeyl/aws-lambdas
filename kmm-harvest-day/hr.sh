#!/bin/bash
for number in 06
do
  dat='2018/01/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-harvest-day --payload $b "a.json" --profile luser --no-verify-ssl
  echo " "
  read -p "Continuing in 3 Seconds...." -t 3
  echo "Continuing ...."
done
exit 0
