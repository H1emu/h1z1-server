FROM node:16-alpine 
WORKDIR /usr/src/app
COPY . .
RUN npm i --production
# Login server port
EXPOSE 1115/udp
# Zone server port
EXPOSE 1117/udp
# Start both of the servers
CMD [ "node", "./docker/2016/h1emuServer.js" ]
