#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Listing all files:"
ls -la

echo "Checking if client directory exists:"
if [ -d "client" ]; then
    echo "✅ Client directory found"
    echo "Client directory contents:"
    ls -la client/
    
    echo "Checking if client/public exists:"
    if [ -d "client/public" ]; then
        echo "✅ Client/public directory found"
        echo "Client/public contents:"
        ls -la client/public/
        
        echo "Checking if index.html exists:"
        if [ -f "client/public/index.html" ]; then
            echo "✅ index.html found"
            echo "index.html contents:"
            head -5 client/public/index.html
        else
            echo "❌ index.html not found!"
            exit 1
        fi
    else
        echo "❌ client/public directory not found!"
        exit 1
    fi
else
    echo "❌ Client directory not found!"
    exit 1
fi

echo "Installing backend dependencies..."
npm install

echo "Installing frontend dependencies..."
cd client
npm install

echo "Building React app..."
npm run build

echo "✅ Build completed successfully!" 