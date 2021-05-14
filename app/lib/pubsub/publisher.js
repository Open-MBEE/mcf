// Import Redis
const Redis = require('ioredis');

// Publisher Instance
const publisher = new Redis({
  port: M.config.auth.session.redis_port, // Redis port
  host: M.config.auth.session.redis_host, // Redis host
  db: M.config.auth.session.redis_db
});

// Exporting the publisher
module.exports = publisher;
