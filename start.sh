#!/bin/bash

echo "Starting Portfolio Site Services..."
echo "================================"

# Function to check if port is in use
check_port() {
    lsof -i:$1 > /dev/null 2>&1
    return $?
}

# Kill existing processes if running
if check_port 1313; then
    echo "Stopping existing Hugo server..."
    pkill -f "hugo server"
fi

if check_port 3335; then
    echo "Stopping existing backend..."
    pkill -f "node.*server-simple"
fi

# Start Hugo server in background
echo "Starting Hugo server..."
hugo server &
HUGO_PID=$!

# Wait for Hugo to start
sleep 3

# Start backend API in background
echo "Starting Backend API..."
cd backend && PORT=3335 npm run start:simple &
API_PID=$!
cd ..

echo ""
echo "Services Started!"
echo "================"
echo "Hugo:    http://localhost:1313       (PID: $HUGO_PID)"
echo "API:     http://localhost:3335       (PID: $API_PID)"
echo "Admin:   http://localhost:1313/admin/login.html"
echo ""
echo "Login: admin / password123"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $HUGO_PID $API_PID; exit" INT
wait