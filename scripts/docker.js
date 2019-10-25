/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.docker
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Leah De Laurell
 *
 * @author Josh Kaplan
 * @author Leah De Laurell
 *
 * @description Builds and runs docker containers.
 */
/* eslint-disable jsdoc/require-description-complete-sentence */
// Rule disabled to allow list in description


// Error Check - Check if file was run directly or global M object is undefined
if (module.parent == null || typeof M === 'undefined') {
  // File was run directly, print error message and exit process
  // eslint-disable-next-line no-console
  console.log('\nError: please use mbee to run this script by using the '
    + 'following command. \n\nnode mbee docker\n');
  process.exit(-1);
}

// Node modules
const { spawn, spawnSync } = require('child_process');

/**
 * @description The Docker command can be used to build a Docker image or run a Docker
 * container. It supports the command line arguments:
 * --clean
 * --build
 * --run
 *
 * @param {string} args - Additional options to pass into the docker function.
 */
function docker(args) {
  // Removes the previous docker build.
  if (args.includes('--clean')) {
    // Stop the running container
    let cmd = spawnSync('docker', ['stop', M.config.docker.container.name], { stdio: 'inherit' });
    console.log('stdout:', cmd.stdout); // eslint-disable-line no-console
    console.log('stderr:', cmd.stderr); // eslint-disable-line no-console
    console.log('Docker container stopped'); // eslint-disable-line no-console

    // Remove the container image
    cmd = spawnSync('docker', ['rm', M.config.docker.container.name], { stdio: 'inherit' });
    console.log('stdout:', cmd.stdout); // eslint-disable-line no-console
    console.log('stderr:', cmd.stderr); // eslint-disable-line no-console
    console.log('Docker container removed'); // eslint-disable-line no-console
  }

  // Build the Docker image
  else if (args.includes('--build')) {
    M.log.info('Building Docker Image ...');

    // Build docker image
    const buildArgs = [
      'build',
      '-f', M.config.docker.Dockerfile,
      '-t', M.config.docker.image.name, '.'
    ];
    // Run build process
    const cmd = spawn('docker', buildArgs, { stdio: 'inherit' });
    cmd.on('data', (data) => {
      console.log(data.toString()); // eslint-disable-line no-console
    });
    cmd.on('exit', (code) => {
      // Check if exit code NOT 0
      if (code !== 0) {
        // exit code NOT 0, fail
        M.log.error('Docker build failed');
        process.exit(code);
      }
      else {
        M.log.info('Docker Image Built.');
      }
    });
  }

  // Run the Docker container
  else if (args.includes('--run')) {
    M.log.info('Running Docker Container ...');

    // Build the "docker run" command
    let rargs = [
      'run',
      '-d',
      '-it',
      '--restart=always',
      '-e', `MBEE_ENV=${M.env}`
    ].concat(args.slice(1));
    // Check if the database is in docker container
    if (M.config.docker.db.enabled) {
      // http and docker http enabled, open specified ports
      rargs = rargs.concat(['-p', `${M.config.docker.db.port}:${M.config.db.port}`]);
    }
    if (M.config.server.http.enabled && M.config.docker.http.enabled) {
      // http and docker http enabled, open specified ports
      rargs = rargs.concat(['-p', `${M.config.docker.http.port}:${M.config.server.http.port}`]);
    }
    // Check if server https and docker https are enabled
    if (M.config.server.https.enabled && M.config.docker.https.enabled) {
      // https and docker https enabled, open specified ports
      rargs = rargs.concat(['-p', `${M.config.docker.https.port}:${M.config.server.https.port}`]);
    }
    // Set docker image name
    rargs = rargs.concat(['--name', M.config.docker.container.name]);
    rargs = rargs.concat([M.config.docker.image.name]);

    // Run the Docker container
    const cmd = spawn('docker', rargs, { stdio: 'inherit' });
    // eslint-disable-next-line no-console
    cmd.on('data', (data) => { console.log(data.toString()); });
    cmd.on('exit', (code) => {
      // Check if exit code NOT 0
      if (code !== 0) {
        // exit code NOT 0, fail
        M.log.error('Docker run failed');
        process.exit(code);
      }
    });
    M.log.info('Docker Container Running in Background.');
  }

  // Get the Docker logs
  else if (args.includes('--get-logs')) {
    M.log.info('Getting docker logs ...');

    // Build the "docker run" command
    const rargs = [
      'logs',
      M.config.docker.container.name
    ];

    // Call the Docker logs command
    const cmd = spawn('docker', rargs, { stdio: 'inherit' });
    // eslint-disable-next-line no-console
    cmd.on('data', (data) => { console.log(data.toString()); });
    cmd.on('exit', (code) => {
      // Check if exit code NOT 0
      if (code !== 0) {
        // exit code NOT 0, fail
        M.log.error('Docker logs failed');
        process.exit(code);
      }
    });
    M.log.info('End of Docker logs.');
  }
  else {
    M.log.info('Invalid arguments');
  }
}

module.exports = docker;
