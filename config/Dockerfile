## THIS IS A SAMPLE DOCKER FILE. 
# Classification: UNCLASSIFIED                                                                                                        
#
# @module config.Dockerfile
#
# @copyright Copyright (C) 2018, Lockheed Martin Corporation
#
# @license MIT
#
# @description This Dockerfile defines the Docker build for MBEE.
# 
##
FROM node:6.14.1
WORKDIR /lm/mbee

# Set proxy environment variables
# Uncomment for proxy use
# ENV HTTP_PROXY="" \
#     HTTPS_PROXY="" \
#     http_proxy="" \
#     https_proxy="" \
#     NO_PROXY=127.0.0.1,localhost

# Prerequisites for MongoDB install
RUN dpkg-divert --local --rename --add /etc/init.d/mongod
RUN ln -s /bin/true /etc/init.d/mongod
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
RUN echo "deb [ arch=amd64 ] http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/4.0 multiverse" | tee -i /etc/apt/sources.list.d/mongodb-org-4.0.list

# Install dependencies
RUN apt-get -y upgrade \
 && apt-get -y update \
 && apt-get install -y git \
 && apt-get install -y openssh-client \
 && apt-get install -y --force-yes mongodb-org

# Install certs - If you have certs in a certs directory, uncomment the following lines
RUN mkdir -p certs
COPY ./certs certs
RUN chmod 400 certs/*

# Configure Yarn
# Uncomment for yarn proxy and Cert
# RUN yarn config set proxy "" \
#     && yarn config set cafile "" \
#     && yarn config set http-proxy "" \
#     && yarn config set https-proxy ""

# Install modules using yarn from the package.json
# Uncomment for git proxy
# COPY ./package.json package.json
# RUN git config --global url."https://github.com".insteadOf "git://github.com"
# RUN git config --global http.proxy ""
# RUN git config --global https.proxy ""
# RUN NOPOSTINSTALL=1 NOPREINSTALL=1 yarn install

# Create project directory structure
RUN mkdir logs \
    && mkdir -p config \
    && mkdir -p scripts \
    && mkdir -p plugins \
    && mkdir -p build \
    && mkdir -p public \
    && mkdir -p app \
    && mkdir -p /lm/mbee/data/db/log

# Copy Project
COPY ./config config
COPY ./scripts scripts
COPY ./mbee.js mbee.js
COPY ./plugins plugins
COPY ./build build
COPY ./app  app
COPY ./README.md README.md

# Make entrypoint.sh an executable
RUN chmod +x /lm/mbee/config/entrypoint.sh

# Define a volume
VOLUME data

# Expose ports
EXPOSE 9080
EXPOSE 9443
EXPOSE 27017

# Run server
ENTRYPOINT /lm/mbee/config/entrypoint.sh


