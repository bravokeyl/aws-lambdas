#!/bin/bash
for day in 31
do
  for hour in 11
  do
    dat="2017/12/"$day"/"$hour
    echo $dat
    pay='{"params":{"querystring":{"dhr":"';
    a='"}}}';
    b=$pay"${dat}"$a
    echo $b
    aws lambda invoke --function-name kmm-hour-energy --payload $b "a.json" --profile luser
    echo " "
    read -p "Continuing in 10 Seconds...." -t 10
    echo "Continuing ...."
  done
done
exit 0
