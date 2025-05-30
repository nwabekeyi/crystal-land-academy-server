# Use the official Node.js image as a base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to install dependencies
COPY package*.json ./

# Install the dependencies
RUN npm install --omit=dev


# Copy the rest of the application files to the container
COPY . .

# Change ownership to non-root user
RUN chown -R node:node /usr/src/app

# Switch to non-root user for security
USER node

# Expose the port the app will run on
EXPOSE 5000

# Set environment variables for production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
