FROM node:16
WORKDIR /usr/local/app/seon
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD [ "node", "dist/main.js" ]
