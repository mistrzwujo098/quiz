#!/bin/bash

# QuizMaster Local Test Runner (No Docker Required)
# This script runs tests directly on the local machine

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
SERVER_PID=""
PROXY_PID=""

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
    
    # Kill servers if running
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ ! -z "$PROXY_PID" ]; then
        kill $PROXY_PID 2>/dev/null || true
    fi
    
    # Clean directories
    rm -rf $TEST_RESULTS_DIR $COVERAGE_DIR $SCREENSHOTS_DIR
    mkdir -p $TEST_RESULTS_DIR $COVERAGE_DIR $SCREENSHOTS_DIR
    
    print_success "Cleanup complete"
}

check_requirements() {
    print_header "Checking requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm found: $(npm --version)"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    print_success "Python found: $(python3 --version)"
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please update .env file with your Gemini API key"
        else
            cat > .env << EOF
# Gemini API Configuration
GEMINI_API_KEY=your_api_key_here

# Test Configuration
APP_URL=http://localhost:8000
API_URL=http://localhost:3001
HEADLESS=true
SLOW_MO=0
TEST_TIMEOUT=30000
EOF
        fi
    else
        print_success ".env file found"
    fi
}

install_dependencies() {
    print_header "Installing dependencies..."
    
    # Install main dependencies
    if [ ! -d "node_modules" ]; then
        print_warning "Installing npm dependencies..."
        npm install
    fi
    
    # Install server dependencies
    if [ ! -d "server/node_modules" ]; then
        print_warning "Installing server dependencies..."
        cd server && npm install && cd ..
    fi
    
    # Install additional test dependencies
    npm install --save-dev chai mocha puppeteer@21.0.0 dotenv
    
    print_success "Dependencies installed"
}

start_web_server() {
    print_header "Starting web server..."
    
    # Kill any existing Python server on port 8000
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    
    # Start Python HTTP server
    python3 -m http.server 8000 > $TEST_RESULTS_DIR/web-server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Check if server is running
    if curl -s http://localhost:8000 > /dev/null; then
        print_success "Web server started on http://localhost:8000 (PID: $SERVER_PID)"
    else
        print_error "Failed to start web server"
        cat $TEST_RESULTS_DIR/web-server.log
        exit 1
    fi
}

start_api_proxy() {
    print_header "Starting API proxy server..."
    
    # Kill any existing server on port 3001
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    
    # Load environment variables
    export $(cat .env | grep -v '^#' | xargs)
    
    # Start Node.js proxy server
    cd server
    node server.js > ../test-results/api-proxy.log 2>&1 &
    PROXY_PID=$!
    cd ..
    
    # Wait for server to start
    sleep 3
    
    # Check if proxy is running
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "API proxy started on http://localhost:3001 (PID: $PROXY_PID)"
    else
        print_error "Failed to start API proxy"
        cat $TEST_RESULTS_DIR/api-proxy.log
        exit 1
    fi
}

run_smoke_tests() {
    print_header "Running smoke tests..."
    
    if [ -f "tests/smoke-test.js" ]; then
        APP_URL=http://localhost:8000 API_URL=http://localhost:3001 \
        node tests/smoke-test.js || {
            print_error "Smoke tests failed"
            return 1
        }
        print_success "Smoke tests passed"
    else
        print_warning "Smoke tests not found, skipping..."
    fi
}

run_unit_tests() {
    print_header "Running unit tests..."
    
    # Run Jest unit tests
    if [ -f "jest.config.js" ] || [ -f "package.json" ]; then
        npm run test -- --testPathPattern=unit || {
            print_error "Unit tests failed"
            return 1
        }
        print_success "Unit tests passed"
    else
        print_warning "No unit tests configured"
    fi
}

run_integration_tests() {
    print_header "Running integration tests..."
    
    # Check if integration tests exist
    if [ -d "tests" ] && ls tests/*integration*.js 1> /dev/null 2>&1; then
        for test in tests/*integration*.js; do
            print_warning "Running $test..."
            APP_URL=http://localhost:8000 API_URL=http://localhost:3001 \
            node "$test" || {
                print_error "$test failed"
                return 1
            }
        done
        print_success "Integration tests passed"
    else
        print_warning "No integration tests found"
    fi
}

run_comprehensive_tests() {
    print_header "Running comprehensive E2E tests..."
    
    if [ -f "tests/comprehensive-test-suite.js" ]; then
        APP_URL=http://localhost:8000 API_URL=http://localhost:3001 \
        HEADLESS=true \
        node tests/comprehensive-test-suite.js || {
            print_error "Comprehensive tests failed"
            return 1
        }
        print_success "Comprehensive tests passed"
    else
        print_error "Comprehensive test suite not found"
        return 1
    fi
}

generate_simple_report() {
    print_header "Generating test report..."
    
    # Create a simple test report
    cat > $TEST_RESULTS_DIR/test-summary.txt << EOF
QuizMaster Test Suite - Summary Report
======================================
Date: $(date)
Environment: Local (No Docker)

Test Results:
- Smoke Tests: ${SMOKE_RESULT:-"Not Run"}
- Unit Tests: ${UNIT_RESULT:-"Not Run"}
- Integration Tests: ${INTEGRATION_RESULT:-"Not Run"}
- E2E Tests: ${E2E_RESULT:-"Not Run"}

Server Logs:
- Web Server: $TEST_RESULTS_DIR/web-server.log
- API Proxy: $TEST_RESULTS_DIR/api-proxy.log

Screenshots: $SCREENSHOTS_DIR/
EOF

    print_success "Test summary saved to: $TEST_RESULTS_DIR/test-summary.txt"
    
    # Try to generate full report if generator exists
    if [ -f "tests/generate-report.js" ]; then
        node tests/generate-report.js || print_warning "Full report generation failed"
    fi
}

# Main execution
main() {
    print_header "QuizMaster Local Test Runner"
    echo "Running tests without Docker..."
    
    # Initialize result tracking
    SMOKE_RESULT="Skipped"
    UNIT_RESULT="Skipped"
    INTEGRATION_RESULT="Skipped"
    E2E_RESULT="Skipped"
    
    # Parse arguments
    QUICK_MODE=false
    SKIP_INSTALL=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                QUICK_MODE=true
                shift
                ;;
            --skip-install)
                SKIP_INSTALL=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --quick         Run only smoke tests"
                echo "  --skip-install  Skip dependency installation"
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
    trap cleanup EXIT
    
    check_requirements
    
    if [ "$SKIP_INSTALL" = false ]; then
        install_dependencies
    fi
    
    start_web_server
    start_api_proxy
    
    # Track overall success
    ALL_PASSED=true
    
    # Run tests based on mode
    if [ "$QUICK_MODE" = true ]; then
        run_smoke_tests && SMOKE_RESULT="Passed" || { SMOKE_RESULT="Failed"; ALL_PASSED=false; }
    else
        run_smoke_tests && SMOKE_RESULT="Passed" || { SMOKE_RESULT="Failed"; ALL_PASSED=false; }
        run_unit_tests && UNIT_RESULT="Passed" || { UNIT_RESULT="Failed"; ALL_PASSED=false; }
        run_integration_tests && INTEGRATION_RESULT="Passed" || { INTEGRATION_RESULT="Failed"; ALL_PASSED=false; }
        run_comprehensive_tests && E2E_RESULT="Passed" || { E2E_RESULT="Failed"; ALL_PASSED=false; }
    fi
    
    # Generate report
    generate_simple_report
    
    # Display summary
    print_header "Test Summary"
    echo "Smoke Tests: $SMOKE_RESULT"
    echo "Unit Tests: $UNIT_RESULT"
    echo "Integration Tests: $INTEGRATION_RESULT"
    echo "E2E Tests: $E2E_RESULT"
    
    # Final result
    if [ "$ALL_PASSED" = true ]; then
        print_success "All tests completed successfully! 🎉"
        exit 0
    else
        print_error "Some tests failed. Check logs for details."
        exit 1
    fi
}

# Handle interrupts
trap 'echo -e "\n${YELLOW}Interrupted. Cleaning up...${NC}"; cleanup; exit 1' INT TERM

# Run main function
main "$@"