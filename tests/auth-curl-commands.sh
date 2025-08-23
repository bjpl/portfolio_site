#!/bin/bash

# cURL Commands for Authentication Testing
# Usage: ./auth-curl-commands.sh [backend-url]

BACKEND_URL=${1:-"http://localhost:3001"}
API_BASE="$BACKEND_URL/api"

echo "🔐 Authentication Testing with cURL Commands"
echo "Backend URL: $BACKEND_URL"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Test 1: Health Check
echo -e "\n${BLUE}1. Testing Health Endpoint${NC}"
echo "Command: curl -X GET '$API_BASE/health'"
echo "Expected: JSON response with health status"
echo "---"

HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/health" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json")

HTTP_STATUS=$(echo $HEALTH_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
HEALTH_BODY=$(echo $HEALTH_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 200 ]; then
    print_status "SUCCESS" "Health endpoint responded with status $HTTP_STATUS"
    echo "Response:"
    echo $HEALTH_BODY | jq '.' 2>/dev/null || echo $HEALTH_BODY
else
    print_status "ERROR" "Health endpoint failed with status $HTTP_STATUS"
    echo "Response: $HEALTH_BODY"
fi

# Test 2: Valid Login
echo -e "\n${BLUE}2. Testing Valid Login Credentials${NC}"
echo "Command: curl -X POST '$API_BASE/auth/login' -d '{\"email\":\"admin@brandondocumentation.com\",\"password\":\"admin123\"}'"
echo "Expected: JSON response with token"
echo "---"

LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{"email":"admin@brandondocumentation.com","password":"admin123"}')

HTTP_STATUS=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 200 ]; then
    print_status "SUCCESS" "Valid login succeeded with status $HTTP_STATUS"
    echo "Response:"
    echo $LOGIN_BODY | jq '.' 2>/dev/null || echo $LOGIN_BODY
    
    # Extract token for further tests
    TOKEN=$(echo $LOGIN_BODY | jq -r '.token // .accessToken // empty' 2>/dev/null)
    if [ ! -z "$TOKEN" ]; then
        print_status "SUCCESS" "Authentication token extracted: ${TOKEN:0:20}..."
    else
        print_status "WARNING" "No token found in response"
    fi
else
    print_status "ERROR" "Valid login failed with status $HTTP_STATUS"
    echo "Response: $LOGIN_BODY"
fi

# Test 3: Invalid Login
echo -e "\n${BLUE}3. Testing Invalid Login Credentials${NC}"
echo "Command: curl -X POST '$API_BASE/auth/login' -d '{\"email\":\"invalid@test.com\",\"password\":\"wrongpassword\"}'"
echo "Expected: 401 Unauthorized response"
echo "---"

INVALID_LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{"email":"invalid@test.com","password":"wrongpassword"}')

HTTP_STATUS=$(echo $INVALID_LOGIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
INVALID_LOGIN_BODY=$(echo $INVALID_LOGIN_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 401 ] || [ $HTTP_STATUS -eq 400 ]; then
    print_status "SUCCESS" "Invalid login correctly rejected with status $HTTP_STATUS"
    echo "Response:"
    echo $INVALID_LOGIN_BODY | jq '.' 2>/dev/null || echo $INVALID_LOGIN_BODY
else
    print_status "ERROR" "SECURITY ISSUE: Invalid login returned status $HTTP_STATUS (should be 401/400)"
    echo "Response: $INVALID_LOGIN_BODY"
fi

# Test 4: Protected Endpoint (without token)
echo -e "\n${BLUE}4. Testing Protected Endpoint (No Token)${NC}"
echo "Command: curl -X GET '$API_BASE/portfolios'"
echo "Expected: 401 Unauthorized response"
echo "---"

PROTECTED_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/portfolios" \
    -H "Accept: application/json")

HTTP_STATUS=$(echo $PROTECTED_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
PROTECTED_BODY=$(echo $PROTECTED_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ $HTTP_STATUS -eq 401 ] || [ $HTTP_STATUS -eq 403 ]; then
    print_status "SUCCESS" "Protected endpoint correctly blocked with status $HTTP_STATUS"
    echo "Response:"
    echo $PROTECTED_BODY | jq '.' 2>/dev/null || echo $PROTECTED_BODY
else
    print_status "WARNING" "Protected endpoint returned status $HTTP_STATUS (expected 401/403)"
    echo "Response: $PROTECTED_BODY"
fi

# Test 5: Protected Endpoint (with token)
if [ ! -z "$TOKEN" ]; then
    echo -e "\n${BLUE}5. Testing Protected Endpoint (With Token)${NC}"
    echo "Command: curl -X GET '$API_BASE/portfolios' -H 'Authorization: Bearer TOKEN'"
    echo "Expected: 200 OK or 404 Not Found"
    echo "---"

    AUTHORIZED_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/portfolios" \
        -H "Accept: application/json" \
        -H "Authorization: Bearer $TOKEN")

    HTTP_STATUS=$(echo $AUTHORIZED_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    AUTHORIZED_BODY=$(echo $AUTHORIZED_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

    if [ $HTTP_STATUS -eq 200 ] || [ $HTTP_STATUS -eq 404 ]; then
        print_status "SUCCESS" "Authorized request succeeded with status $HTTP_STATUS"
        echo "Response:"
        echo $AUTHORIZED_BODY | jq '.' 2>/dev/null || echo $AUTHORIZED_BODY
    elif [ $HTTP_STATUS -eq 401 ] || [ $HTTP_STATUS -eq 403 ]; then
        print_status "WARNING" "Token might be invalid or endpoint requires different permissions (status $HTTP_STATUS)"
        echo "Response: $AUTHORIZED_BODY"
    else
        print_status "ERROR" "Authorized request failed with unexpected status $HTTP_STATUS"
        echo "Response: $AUTHORIZED_BODY"
    fi
else
    echo -e "\n${YELLOW}5. Skipping Protected Endpoint Test (No Token Available)${NC}"
fi

# Test 6: CORS Preflight Request
echo -e "\n${BLUE}6. Testing CORS Preflight Request${NC}"
echo "Command: curl -X OPTIONS '$API_BASE/health'"
echo "Expected: CORS headers in response"
echo "---"

CORS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X OPTIONS "$API_BASE/health" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -H "Origin: http://localhost:1313" \
    -v 2>&1)

echo "$CORS_RESPONSE"

# Test 7: Rate Limiting Test
echo -e "\n${BLUE}7. Testing Rate Limiting${NC}"
echo "Command: Multiple rapid requests to '$API_BASE/health'"
echo "Expected: Some requests might return 429 Too Many Requests"
echo "---"

echo "Making 10 rapid requests..."
for i in {1..10}; do
    RATE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$API_BASE/health" \
        -H "Accept: application/json")
    
    HTTP_STATUS=$(echo $RATE_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ $HTTP_STATUS -eq 429 ]; then
        print_status "SUCCESS" "Request $i: Rate limited (status $HTTP_STATUS)"
        break
    elif [ $HTTP_STATUS -eq 200 ]; then
        echo "Request $i: OK (status $HTTP_STATUS)"
    else
        print_status "WARNING" "Request $i: Unexpected status $HTTP_STATUS"
    fi
done

# Summary
echo -e "\n${BLUE}============== TEST SUMMARY ==============${NC}"
echo "Health Endpoint: Tested"
echo "Valid Login: Tested"
echo "Invalid Login: Tested"
echo "Protected Endpoint (No Auth): Tested"
if [ ! -z "$TOKEN" ]; then
    echo "Protected Endpoint (With Auth): Tested"
else
    echo "Protected Endpoint (With Auth): Skipped (No Token)"
fi
echo "CORS Headers: Tested"
echo "Rate Limiting: Tested"

echo -e "\n${GREEN}Testing completed!${NC}"
echo "Review the output above for any issues or security concerns."

# Export useful commands for manual testing
echo -e "\n${BLUE}============== MANUAL TEST COMMANDS ==============${NC}"
echo "# Test health endpoint:"
echo "curl -X GET '$API_BASE/health' -H 'Accept: application/json'"

echo -e "\n# Test login with valid credentials:"
echo "curl -X POST '$API_BASE/auth/login' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"admin@brandondocumentation.com\",\"password\":\"admin123\"}'"

echo -e "\n# Test login with invalid credentials:"
echo "curl -X POST '$API_BASE/auth/login' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"invalid@test.com\",\"password\":\"wrongpassword\"}'"

if [ ! -z "$TOKEN" ]; then
    echo -e "\n# Test protected endpoint with token:"
    echo "curl -X GET '$API_BASE/portfolios' \\"
    echo "  -H 'Authorization: Bearer $TOKEN' \\"
    echo "  -H 'Accept: application/json'"
fi

echo -e "\n# Test CORS preflight:"
echo "curl -X OPTIONS '$API_BASE/health' \\"
echo "  -H 'Access-Control-Request-Method: GET' \\"
echo "  -H 'Origin: http://localhost:1313' \\"
echo "  -v"