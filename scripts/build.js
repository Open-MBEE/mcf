#!/usr/bin/env node
/**
 * Classification: UNCLASSIFIED
 *
 * @module scripts.build
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description Creates the necessary static assets used by the MBEE UI.
 */

// Error Check - Check if file was run directly or global M object is undefined
if (module.parent == null || typeof M === 'undefined') {
  // File was run directly, print error message and exit process
  // eslint-disable-next-line no-console
  console.log('\nError: please use mbee to run this script by using the '
    + 'following command. \n\nnode mbee build\n');
  process.exit(-1);
}

// Node modules
const { execSync } = require('child_process');

// NPM modules
const gulp = require('gulp');
const sass = require('gulp-sass');


/**
 * @description Builds the MBEE static assets by:
 * - Copying dependencies to their final location,
 * - Compiling Sass into CSS
 * - Building Javascript libraries into client-side code
 * - Building JSDoc documentation.
 *
 * Accepts the following command-line parameters:
 * --copy-deps
 * --sass
 * --jsdoc
 * --all
 *
 * If NO arguments given, defaults to `--all`
 */
function build(_args) {
  M.log.info('Building MBEE ...');

  // Assign parameters to args. If no parameters, default to '--all'
  const args = (_args === undefined || _args.length === 0) ? ['--all'] : _args;

  // Copy static dependencies to build directory
  if (args.includes('--all') || args.includes('--copy-deps')) {
    M.log.info('  + Copying dependencies ...');

    // Copy images
    gulp.src('./app/ui/img/**/*')
    .pipe(gulp.dest('build/public/img'));

    // Copy Swagger CSS
    gulp.src('./node_modules/swagger-ui-express/static/*.css')
    .pipe(gulp.dest('build/public/css'));

    // Copy Swagger JS
    gulp.src('./node_modules/swagger-ui-express/static/*.js')
    .pipe(gulp.dest('build/public/js'));

    // Copy Bootstrap JS
    gulp.src('./node_modules/bootstrap/dist/js/bootstrap.min.js')
    .pipe(gulp.dest('build/public/js'));
    gulp.src('./node_modules/bootstrap/dist/js/bootstrap.min.js.map')
    .pipe(gulp.dest('build/public/js'));

    // Copy Jquery JS
    gulp.src('./node_modules/jquery/dist/jquery.min.js')
    .pipe(gulp.dest('build/public/js'));

    // Copy Popper JS
    gulp.src('./node_modules/popper.js/dist//umd/popper.min.js')
    .pipe(gulp.dest('build/public/js'));
    gulp.src('./node_modules/popper.js/dist//umd/popper.min.js.map')
    .pipe(gulp.dest('build/public/js'));
  }

  // Compile Sass into CSS
  if (args.includes('--all') || args.includes('--sass')) {
    M.log.info('  + Compiling sass ...');
    gulp.src('./app/ui/sass/**/*.scss')
    .pipe(sass({ outputStyle: 'compressed' })
    .on('error', sass.logError))
    .pipe(gulp.dest('build/public/css'));
  }

  // Build JSDoc
  if (args.includes('--all') || args.includes('--jsdoc')) {
    M.log.info('  + Building jsdoc ...');
    // Create JSDoc build command
    const jsdoc = `${process.argv[0]} node_modules/jsdoc/jsdoc.js`;
    const cmd = `${jsdoc} -c ./config/jsdoc.json`;

    // Execute JSDoc build command
    execSync(cmd);
  }

  M.log.info('Build Complete.');
}

module.exports = build;
