#!/bin/bash

# Run frontend tests
echo "Running frontend tests..."
npm test

# Exit with the test result status code
exit $?
