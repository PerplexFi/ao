FROM node:22

WORKDIR /usr/app

COPY ./package.json .
COPY ./package-lock.json .
RUN npm install --omit=dev

COPY ./src ./src

RUN mkdir /db/ && mkdir /file-checkpoints/

ENV NODE_ENV=production

EXPOSE 6363

ENTRYPOINT ["npm"]

CMD ["run", "start"]
