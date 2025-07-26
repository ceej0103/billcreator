# Use Node.js 18
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy all source files
COPY . .

# Build the React app
RUN cd client && npm run build

# Expose port
EXPOSE 5000

# Start the app
CMD ["npm", "start"] 