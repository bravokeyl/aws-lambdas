#!/bin/bash

aws lambda invoke --function-name kmm-get-power  "a.json" --profile luser --no-verify-ssl
