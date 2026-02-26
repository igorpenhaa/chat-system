FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . /app
#COPY ../chat.proto /app/chat.proto

EXPOSE 50051

CMD ["node", "server_a.js"]

