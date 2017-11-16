#!/bin/bash
# https://pyz1xbouqb.execute-api.us-east-1.amazonaws.com/l/h?dhr=
for number in {28..30}
do
  dat='2017/09/'$number
  echo $dat
  pay='{"params":{"querystring":{"dhr":"';
  a='"}}}';
  b=$pay"${dat}"$a
  echo $b
  aws lambda invoke --function-name kmm-current-day --payload $b "a.json"
  echo " "
  read -p "Continuing in 3 Seconds...." -t 3
  echo "Continuing ...."
done
exit 0
