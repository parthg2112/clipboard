FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache libc6-compat

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the app source
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js
RUN npm run build

# Make sure upload directory exists
RUN mkdir -p public/uploads

EXPOSE 3000
CMD ["node", "server.js"]
