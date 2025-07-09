#!/bin/bash

# QuizMaster Comprehensive Test Runner
# This script runs all tests and generates reports using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="./test-results"
COVERAGE_DIR="./coverage"
SCREENSHOTS_DIR="./tests/screenshots"

# Functions
print_header() {
    echo -e "\n${BLUE}===================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

cleanup() {
    print_header "Cleaning up..."
    docker-compose -f docker-compose.test.yml down -v || true
    rm -rf $TEST_RESULTS_DIR $COVERAGE_DIR $SCREENSHOTS_DIR
    mkdir -p $TEST_RESULTS_DIR $COVERAGE_DIR $SCREENSHOTS_DIR
    print_success "Cleanup complete"
}

check_requirements() {
    print_header "Checking requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found"
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cat > .env << EOF
# Gemini API Configuration
GEMINI_API_KEY=your_api_key_here

# Test Configuration
TEST_MODE=true
HEADLESS=true
SLOW_MO=0
TEST_TIMEOUT=30000
EOF
        print_warning "Please update .env file with your Gemini API key"
    else
        print_success ".env file found"
    fi
}

build_containers() {
    print_header "Building Docker containers..."
    docker-compose -f docker-compose.test.yml build --no-cache
    print_success "Containers built successfully"
}

start_services() {
    print_header "Starting services..."
    
    # Start web and API services
    docker-compose -f docker-compose.test.yml up -d web api-proxy
    
    # Wait for services to be healthy
    print_warning "Waiting for services to be ready..."
    
    # Wait for web service
    attempt=0
    max_attempts=30
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8000 > /dev/null; then
            print_success "Web service is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Web service failed to start"
        docker-compose -f docker-compose.test.yml logs web
        exit 1
    fi
    
    # Wait for API proxy
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:3001/health > /dev/null; then
            print_success "API proxy is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "API proxy failed to start"
        docker-compose -f docker-compose.test.yml logs api-proxy
        exit 1
    fi
}

run_unit_tests() {
    print_header "Running unit tests..."
    
    docker-compose -f docker-compose.test.yml run --rm test-runner npm run test:unit || {
        print_error "Unit tests failed"
        return 1
    }
    
    print_success "Unit tests passed"
}

run_integration_tests() {
    print_header "Running integration tests..."
    
    docker-compose -f docker-compose.test.yml run --rm test-runner npm run test:integration || {
        print_error "Integration tests failed"
        return 1
    }
    
    print_success "Integration tests passed"
}

run_comprehensive_tests() {
    print_header "Running comprehensive E2E tests..."
    
    docker-compose -f docker-compose.test.yml run --rm \
        -e HEADLESS=true \
        -e APP_URL=http://web:8000 \
        -e API_URL=http://api-proxy:3001 \
        test-runner node tests/comprehensive-test-suite.js || {
        print_error "Comprehensive tests failed"
        return 1
    }
    
    print_success "Comprehensive tests passed"
}

collect_logs() {
    print_header "Collecting logs..."
    
    # Create logs directory
    mkdir -p $TEST_RESULTS_DIR/logs
    
    # Collect container logs
    docker-compose -f docker-compose.test.yml logs web > $TEST_RESULTS_DIR/logs/web.log
    docker-compose -f docker-compose.test.yml logs api-proxy > $TEST_RESULTS_DIR/logs/api-proxy.log
    docker-compose -f docker-compose.test.yml logs test-runner > $TEST_RESULTS_DIR/logs/test-runner.log 2>&1 || true
    
    print_success "Logs collected"
}

generate_reports() {
    print_header "Generating test reports..."
    
    docker-compose -f docker-compose.test.yml run --rm test-reporter || {
        print_warning "Report generation failed, but continuing..."
    }
    
    # Copy artifacts from container
    docker cp quizmaster-test-app:/app/tests/reports/. $TEST_RESULTS_DIR/ 2>/dev/null || true
    docker cp quizmaster-test-app:/app/tests/screenshots/. $SCREENSHOTS_DIR/ 2>/dev/null || true
    docker cp quizmaster-test-app:/app/coverage/. $COVERAGE_DIR/ 2>/dev/null || true
    
    print_success "Reports generated"
}

analyze_results() {
    print_header "Analyzing test results..."
    
    # Find the latest report
    latest_report=$(find $TEST_RESULTS_DIR -name "combined-report-*.json" -type f -print0 | xargs -0 ls -t | head -n 1)
    
    if [ -f "$latest_report" ]; then
        # Extract summary from JSON report
        total_tests=$(jq -r '.summary.totalTests' "$latest_report")
        passed_tests=$(jq -r '.summary.totalPassed' "$latest_report")
        failed_tests=$(jq -r '.summary.totalFailed' "$latest_report")
        success_rate=$(jq -r '.summary.successRate' "$latest_report")
        
        echo -e "\n${BLUE}Test Summary:${NC}"
        echo -e "Total Tests: $total_tests"
        echo -e "Passed: ${GREEN}$passed_tests${NC}"
        echo -e "Failed: ${RED}$failed_tests${NC}"
        echo -e "Success Rate: $success_rate%"
        
        if [ "$failed_tests" -gt 0 ]; then
            echo -e "\n${RED}Failed Tests:${NC}"
            jq -r '.failureAnalysis.criticalFailures[] | "- \(.name) (\(.category)): \(.error)"' "$latest_report" 2>/dev/null || true
        fi
        
        # Check if we should fail the build
        if [ "$success_rate" = "100.00" ]; then
            print_success "All tests passed! 🎉"
            return 0
        else
            print_error "Some tests failed. Check reports for details."
            return 1
        fi
    else
        print_warning "No test report found"
        return 1
    fi
}

open_reports() {
    # Find HTML report
    html_report=$(find $TEST_RESULTS_DIR -name "combined-report-*.html" -type f -print0 | xargs -0 ls -t | head -n 1)
    
    if [ -f "$html_report" ]; then
        print_success "HTML report generated: $html_report"
        
        # Try to open in browser (works on macOS and some Linux distros)
        if command -v open &> /dev/null; then
            open "$html_report"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$html_report"
        else
            echo "Open the report manually: $html_report"
        fi
    fi
}

# Main execution
main() {
    print_header "QuizMaster Test Suite Runner"
    echo "Starting comprehensive test execution..."
    
    # Parse arguments
    SKIP_BUILD=false
    KEEP_RUNNING=false
    QUICK_MODE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --keep-running)
                KEEP_RUNNING=true
                shift
                ;;
            --quick)
                QUICK_MODE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-build    Skip Docker container rebuild"
                echo "  --keep-running  Keep services running after tests"
                echo "  --quick         Run only unit tests (fast mode)"
                echo "  --help          Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run test pipeline
    check_requirements
    
    if [ "$SKIP_BUILD" = false ]; then
        cleanup
        build_containers
    fi
    
    start_services
    
    # Track test results
    TESTS_PASSED=true
    
    # Run tests based on mode
    if [ "$QUICK_MODE" = true ]; then
        run_unit_tests || TESTS_PASSED=false
    else
        run_unit_tests || TESTS_PASSED=false
        run_integration_tests || TESTS_PASSED=false
        run_comprehensive_tests || TESTS_PASSED=false
    fi
    
    # Always collect logs and generate reports
    collect_logs
    generate_reports
    
    # Analyze and display results
    analyze_results || TESTS_PASSED=false
    
    # Open reports
    open_reports
    
    # Cleanup or keep running
    if [ "$KEEP_RUNNING" = false ]; then
        print_header "Stopping services..."
        docker-compose -f docker-compose.test.yml down
    else
        print_warning "Services are still running. Stop with: docker-compose -f docker-compose.test.yml down"
    fi
    
    # Exit with appropriate code
    if [ "$TESTS_PASSED" = true ]; then
        print_success "All tests completed successfully! 🎉"
        exit 0
    else
        print_error "Some tests failed. Please check the reports."
        exit 1
    fi
}

# Handle interrupts
trap 'echo -e "\n${YELLOW}Interrupted. Cleaning up...${NC}"; docker-compose -f docker-compose.test.yml down; exit 1' INT TERM

# Run main function
main "$@"