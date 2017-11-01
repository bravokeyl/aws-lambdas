#!/bin/bash
# https://pyz1xbouqb.execute-api.us-east-1.amazonaws.com/l/h?dhr=
for number in 31
do
  dat='2017/10/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-day-energy --payload $b "a.json"
  echo " "
  read -p "Continuing in 2 Seconds...." -t 2
  echo "Continuing ...."
done
exit 0
