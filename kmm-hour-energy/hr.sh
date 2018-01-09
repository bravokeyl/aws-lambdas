#!/bin/bash
for day in {01..03}
do
  for hour in {00..23}
  do
    dat="2018/01/"$day"/"$hour
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
