#!/bin/bash

for number in 30
do
  dat='2017/12/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-day-energy --payload $b "a.json" --profile luser
  echo " "
  read -p "Continuing in 2 Seconds...." -t 2
  echo "Continuing ...."
done
exit 0
