#!/bin/bash
for number in {00..23}
do
  dat='2017/12/12/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-harvest-hour --payload $b "a.json" --profile luser
  echo " "
  read -p "Continuing in 6 Seconds...." -t 6
  echo "Continuing ...."
done
exit 0
