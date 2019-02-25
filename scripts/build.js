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
const path = require('path');
const fs = require('fs');

// NPM modules
const gulp = require('gulp');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const sass = require('gulp-sass');
const markdown = require('gulp-markdown');
const webpack = require('webpack');
const validators = M.require('lib.validators');

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
 * --react
 * --jsdoc
 * --fm
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

    // Copy Jquery UI JS
    gulp.src(['./node_modules/jquery-ui/ui/effect.js', './node_modules/jquery-ui/ui/effects/*.js'])
    .pipe(concat('jquery-ui.js'))
    .pipe(minify({ noSource: true }))
    .pipe(gulp.dest('build/public/js'));

    // Copy Popper JS
    gulp.src('./node_modules/popper.js/dist//umd/popper.min.js')
    .pipe(gulp.dest('build/public/js'));
    gulp.src('./node_modules/popper.js/dist//umd/popper.min.js.map')
    .pipe(gulp.dest('build/public/js'));

    // Copy Font-Awesome dependencies
    gulp.src('./node_modules/@fortawesome/fontawesome-free/webfonts/**/*')
    .pipe(gulp.dest('build/public/webfonts'));
  }

  // Initialize validators for UI validation
  const validator = {
    org: {
      id: validators.org.id,
      name: validators.org.name
    },
    project: {
      id: validators.project.id,
      name: validators.project.name
    },
    user: {
      fname: validators.user.fname,
      lname: validators.user.lname,
      username: validators.user.username
    }
  };

  // Initialize the build directory
  if (!fs.existsSync('build')) {
    fs.mkdirSync('build');
  }

  // Initialize validator directory
  const validatorsDir = path.join(M.root, 'build', 'json');
  if (!fs.existsSync(validatorsDir)) {
    // Make validators directory
    fs.mkdirSync(validatorsDir);
  }

  // Import validator object into validators file
  fs.writeFileSync(path.join(validatorsDir, 'validators.json'), JSON.stringify(validator), 'utf8');

  // Transpile React components
  if (args.includes('--all') || args.includes('--react')) {
    webpack({
      mode: 'production',
      entry: {
        navbar: path.join(M.root, 'app', 'ui', 'react-components', 'general-components', 'nav.jsx'),
        'home-page': path.join(M.root, 'app', 'ui', 'react-components', 'home-page', 'home-page.jsx'),
        organizations: path.join(M.root, 'app', 'ui', 'react-components', 'organizations', 'organizations.jsx'),
        projects: path.join(M.root, 'app', 'ui', 'react-components', 'projects', 'projects.jsx'),
        user: path.join(M.root, 'app', 'ui', 'react-components', 'user', 'user.jsx')
      },
      output: {
        path: path.join(M.root, 'build', 'public', 'react-js'),
        filename: '[name].js'
      },
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            options: {
              presets: ['babel-preset-env', 'babel-preset-react']
            }
          }
        ]
      }
    }, (err, stats) => {
      if (err || stats.hasErrors()) {
        // eslint-disable-next-line no-console
        console.log(stats.compilation.errors);
      }
    });
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

  // Build Flight Manual
  if (args.includes('--all') || args.includes('--fm')) {
    M.log.info('  + Building flight manual ...');
    gulp.src('./doc/**/*.md')
    .pipe(markdown())
    .pipe(gulp.dest('build/fm'));
  }

  M.log.info('Build Complete.');
}

module.exports = build;
