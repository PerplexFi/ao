FROM node:22

RUN apt update && apt install -y bash git awscli

WORKDIR /usr/app

COPY ./package.json .
COPY ./package-lock.json .
RUN npm install --ignore-engines

COPY ./src ./src

RUN mkdir /usr/app/mu-data/

EXPOSE 3005

CMD ["node", "src/app.js"]
