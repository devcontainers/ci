#!/bin/bash
set -e

echo "**************************************************"
echo "*** In post-create.sh "
echo "*** TEST_ENV_VALUE=${TEST_ENV_VALUE}"
echo "*** TEST_ENV_VALUE2=${TEST_ENV_VALUE2}"
echo "**************************************************"
echo "post-create: TEST_ENV_VALUE=${TEST_ENV_VALUE}" > marker.txt
echo "post-create: TEST_ENV_VALUE2=${TEST_ENV_VALUE2}" >> marker.txt

