#!/bin/bash
for day in 22
do
  for hour in {00..11}
  do
    dat="2018/01/"$day"/"$hour
    echo $dat
    pay='{"params":{"querystring":{"dhr":"';
    a='"}}}';
    b=$pay"${dat}"$a
    echo $b
    aws lambda invoke --function-name kmm-hour-energy --payload $b "a.json" --profile luser
    echo " "
    read -p "Continuing in 5 Seconds...." -t 5
    echo "Continuing ...."
  done
done
exit 0
