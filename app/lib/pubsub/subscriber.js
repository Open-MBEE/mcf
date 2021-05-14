// Import Redis
const Redis = require('ioredis');

// Subscriber Instance
const subscriber = new Redis({
  port: M.config.auth.session.redis_port, // Redis port
  host: M.config.auth.session.redis_host, // Redis host
  db: M.config.auth.session.redis_db
});

// Exporting the subscriber
module.exports = subscriber;
