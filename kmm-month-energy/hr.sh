#!/bin/bash
for number in 02
do
  dat='2018/'$number
  echo $dat
  pay='{"params":{"querystring":{"ddm":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-month-energy --payload $b "a.json" --profile luser --no-verify-ssl
  echo " "
  read -p "Continuing in 5 Seconds...." -t 5
  echo "Continuing ...."
done
exit 0
