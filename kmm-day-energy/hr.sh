#!/bin/bash

for number in 06
do
  dat='2018/02/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-day-energy --payload $b "a.json" --profile luser --no-verify-ssl
  echo " "
  read -p "Continuing in 10 Seconds...." -t 5
  echo "Continuing ...."
done
exit 0
