FROM registry.access.redhat.com/ubi7/ubi
WORKDIR /opt/mbee

# Create mbee user and run mcf under that context
RUN groupadd -r mcf -g 1020 \
     && useradd -u 1020 -r -g mcf -m -d /opt/mbee -s /sbin/nologin -c "MCF user" mcf

ENV MBEE_ENV=default \
    NODE_ENV=development

# Copy Project
COPY . ./

# Create log and artifact project directories
RUN mkdir logs \
    && mkdir -p data/artifacts \
    && mkdir -p all_plugins

COPY ./plugins all_plugins

# Change permission on entrypoint and mbee directory
RUN chmod +x ./docker-entrypoint.sh \
    && chmod 755 /opt/mbee \
    && chown -R mcf:mcf /opt/mbee

# Install wget and git
RUN yum install -y wget git

# Install Prince
RUN curl -kL -o ./prince-13.5-1.centos7.x86_64.rpm \
    https://www.princexml.com/download/prince-13.5-1.centos7.x86_64.rpm \
    && yum install -y ./prince-13.5-1.centos7.x86_64.rpm \
    && rm prince-13.5-1.centos7.x86_64.rpm

# Install NodeJS 12
RUN wget https://nodejs.org/dist/v12.18.4/node-v12.18.4-linux-x64.tar.gz --no-check-certificate \
    && tar --strip-components 1 -xzvf node-v* -C /usr/local

# Init git configuration
RUN git init \
    && git config user.email "example@example.com" \
    && git config user.name "MBEE Container Runtime" \
    && git add . \
    && git commit -m "Initialize Container" -q

# Install yarn
RUN npm install -g yarn

# Update permissions and install plugin dependencies
RUN chmod +x ./scripts/install-plugin-modules.sh \
    && ./scripts/install-plugin-modules.sh

# Init mcf user
USER mcf

# Install yarn packages
RUN NOPOSTINSTALL=1 NOPREINSTALL=1 yarn install

VOLUME all_plugins
EXPOSE 9080 9443

# Run server
ENTRYPOINT ["/opt/mbee/docker-entrypoint.sh"]

CMD ["node","mbee","start"]
