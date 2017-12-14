#!/bin/bash
for number in 11
do
  dat='2017/12/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-harvest-day --payload $b "a.json" --profile luser
  echo " "
  read -p "Continuing in 3 Seconds...." -t 3
  echo "Continuing ...."
done
exit 0
