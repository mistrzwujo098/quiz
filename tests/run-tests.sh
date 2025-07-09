#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting QuizMaster Test Suite${NC}"
echo "=================================="

# Function to cleanup
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    docker-compose -f docker-compose.test.yml down -v
    exit $1
}

# Trap to ensure cleanup on exit
trap 'cleanup $?' EXIT INT TERM

# Build test environment
echo -e "\n${YELLOW}Building test environment...${NC}"
docker-compose -f docker-compose.test.yml build --no-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build test environment${NC}"
    exit 1
fi

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Check test results
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
else
    echo -e "\n${RED}Some tests failed!${NC}"
    
    # Show logs
    echo -e "\n${YELLOW}Test logs:${NC}"
    docker-compose -f docker-compose.test.yml logs test-runner
fi

# Copy test artifacts
echo -e "\n${YELLOW}Copying test artifacts...${NC}"
docker cp quizmaster-test-runner:/app/tests/screenshots ./tests/ 2>/dev/null || true
docker cp quizmaster-test-runner:/app/tests/reports ./tests/ 2>/dev/null || true
docker cp quizmaster-test-runner:/app/coverage ./coverage 2>/dev/null || true

echo -e "\n${GREEN}Test run complete!${NC}"
echo "Test report: ./tests/reports/test-report.html"
echo "Coverage report: ./coverage/lcov-report/index.html"
echo "Screenshots: ./tests/screenshots/"