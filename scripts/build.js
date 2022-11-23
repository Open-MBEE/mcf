#!/usr/bin/env node
/**
 * @classification UNCLASSIFIED
 *
 * @module scripts.build
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license Apache-2.0
 *
 * @owner Connor Doyle
 *
 * @author Josh Kaplan
 * @author Leah De Laurell
 *
 * @description Creates the necessary static assets used by the MBEE UI.
 */
/* eslint-disable jsdoc/require-description-complete-sentence */
// Rule disabled to allow list in description

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
const rename = require('gulp-rename');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlReplaceWebpackPlugin = require('html-replace-webpack-plugin');

// MBEE modules
const validators = M.require('lib.validators');
const utils = M.require('lib.utils');

const basePath = () => {
  let bpath = '';
  if (typeof M.config.server.ui.basePath !== 'undefined') {
    bpath = M.config.server.ui.basePath.replace(/\/$/, '');
  }
  return bpath;
};

/**
 * @description Builds the MBEE static assets by:
 * - Copying dependencies to their final location
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
 *
 * @param {string} _args - Additional options to pass into the build function.
 *
 * @returns {Promise} - Returns an empty promise upon completion.
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
    gulp.src([
      './node_modules/jquery-ui-dist/jquery-ui.min.js'
    ])
    .pipe(gulp.dest('build/public/js'));

    // Copy Popper JS
    gulp.src('./node_modules/popper.js/dist//umd/popper.min.js')
    .pipe(gulp.dest('build/public/js'));
    gulp.src('./node_modules/popper.js/dist//umd/popper.min.js.map')
    .pipe(gulp.dest('build/public/js'));

    // Copy Font-Awesome dependencies
    gulp.src('./node_modules/@fortawesome/fontawesome-free/webfonts/**/*')
    .pipe(gulp.dest('build/public/webfonts'));

    // Copy MBEE JS
    gulp.src('./app/ui/js/**/*.js')
    .pipe(concat('mbee.js'))
    .pipe(minify({ ext: { min: '.min.js' } }))
    .pipe(gulp.dest('build/public/js'));
  }

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

  // Append ID Delimiter to validators object
  const _validators = JSON.parse(JSON.stringify(validators));
  _validators.ID_DELIMITER = utils.ID_DELIMITER;

  // Import validator object into validators file
  fs.writeFileSync(path.join(validatorsDir, 'validators.json'), JSON.stringify(_validators), 'utf8');

  // Store UI Login Modal
  fs.writeFileSync(path.join(validatorsDir, 'uiConfig.json'), JSON.stringify(M.config.server.ui), 'utf8');


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
    const jsdoc = `node ${path.join('node_modules', 'jsdoc', 'jsdoc.js')}`;
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

    // Add database configuration README as an appendix
    gulp.src('./app/db/*.md')
    .pipe(markdown())
    .pipe(rename('appendix-C-database-configuration.html'))
    .pipe(gulp.dest('build/fm'));
  }

  // Returning a promise to make synchronous
  return new Promise((resolve, reject) => {
    // Transpile React components
    if (args.includes('--all') || args.includes('--react')) {
      // Set default mode
      let mode = 'production';

      // Verify if mode provided
      if (M.config.server.ui.mode) {
        // Set config mode
        mode = M.config.server.ui.mode;
      }

      M.log.info(`  + Transpiling react in ${mode} mode...`);
      webpack({
        mode: mode,
        entry: {
          main: path.join(M.root, 'app', 'ui', 'components', 'Index.jsx')
        },
        output: {
          path: path.join(M.root, 'build', 'public', 'js'),
          filename: 'index_bundle.js',
          publicPath: `${basePath()}/js/`
        },
        devServer: {
          historyApiFallback: true
        },
        module: {
          rules: [
            {
              test: /\.jsx?$/,
              loader: 'babel-loader',
              exclude: /node_modules/,
              options: {
                presets: ['@babel/preset-env', '@babel/preset-react'],
                plugins: ['@babel/transform-runtime']
              }
            }
          ]
        },
        plugins: [
          new HtmlWebpackPlugin({
            template: path.join(M.root, 'app', 'ui', 'html', 'index_template.html'),
            filename: path.join(M.root, 'build', 'public', 'index.html')
          }),
          new HtmlReplaceWebpackPlugin([
            {
              pattern: '@@basePath',
              replacement: `${basePath()}/`
            }

          ])
        ]
      }, (err, stats) => {
        if (err || stats.hasErrors()) {
          // eslint-disable-next-line no-console
          console.log(stats.compilation.errors);
          return reject();
        }
        return resolve();
      });
    }
    else {
      return resolve();
    }
  })
  .then(() => {
    M.log.info('Build Complete.');
  })
  .catch((e) => {
    M.log.warn('React build FAILED');
    M.log.debug(e.stack);
    M.log.info('Build Complete.');
  });
}

module.exports = build;
