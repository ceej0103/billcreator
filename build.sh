#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

echo "Installing backend dependencies..."
npm install

echo "Checking if client directory exists..."
if [ -d "client" ]; then
    echo "Client directory found"
    ls -la client/
else
    echo "Client directory not found!"
    exit 1
fi

echo "Installing frontend dependencies..."
cd client
npm install

echo "Building React app..."
npm run build

echo "Build completed successfully!" 