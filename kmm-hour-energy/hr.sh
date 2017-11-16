#!/bin/bash
# https://pyz1xbouqb.execute-api.us-east-1.amazonaws.com/l/h?dhr=
for day in {01..13}
do
  for hour in {00..23}
  do
    dat="2017/11/"$day"/"$hour
    echo $dat
    pay='{"params":{"querystring":{"dhr":"';
    a='"}}}';
    b=$pay"${dat}"$a
    echo $b
    aws lambda invoke --function-name kmm-hour-energy --payload $b "a.json"
    echo " "
    read -p "Continuing in 3 Seconds...." -t 3
    echo "Continuing ...."
  done
done
exit 0
