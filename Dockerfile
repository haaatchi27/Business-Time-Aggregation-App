# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) files
COPY package*.json ./

# Install project dependencies
RUN npm install --production

# Install tzdata for timezone support
RUN apk add --no-cache tzdata

# Copy the rest of the application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
# Define where the SQLite database will be stored (to be mounted as a volume)
ENV DB_PATH=/app/data/database.sqlite

# Create a data directory for the SQLite database
RUN mkdir -p /app/data

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
