FROM node:16.18.1-bullseye-slim

RUN apt-get update -y && apt-get upgrade -y && apt-get install -y openssl zip unzip

RUN apt-get install -y libgmp-dev libpq-dev libaio1 libpng-dev libjpeg-dev libfreetype6-dev gnupg wget apt-utils libxml2-dev gnupg apt-transport-https
# Download Oracle
RUN mkdir -p /opt/oracle \
    && cd /opt/oracle \
    && wget https://download.oracle.com/otn_software/linux/instantclient/215000/instantclient-basic-linux.x64-21.5.0.0.0dbru.zip \
    && wget https://download.oracle.com/otn_software/linux/instantclient/215000/instantclient-sdk-linux.x64-21.5.0.0.0dbru.zip \
    && unzip instantclient-basic-linux.x64-21.5.0.0.0dbru.zip \
    && unzip instantclient-sdk-linux.x64-21.5.0.0.0dbru.zip \
    && echo /opt/oracle/instantclient_21_5 > /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig

WORKDIR /app

COPY package* ./
RUN npm install

# Set NODE_ENV environment variable
ENV NODE_ENV production
ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout

COPY ./ ./
RUN npm run build

# Start the server using the production build
CMD [ "node", "--max-old-space-size=8192", "dist/main.js" ]