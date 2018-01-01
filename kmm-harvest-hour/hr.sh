#!/bin/bash
for number in 11
do
  dat='2017/12/11/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-harvest-hour --payload $b "a.json" --profile luser
  echo " "
  read -p "Continuing in 10 Seconds...." -t 10
  echo "Continuing ...."
done
exit 0