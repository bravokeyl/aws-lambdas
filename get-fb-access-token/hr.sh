#!/bin/bash

aws lambda invoke --function-name get-fb-access-token "response.json" --profile luser
