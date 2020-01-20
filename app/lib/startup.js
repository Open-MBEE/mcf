/**
 * @classification UNCLASSIFIED
 *
 * @module lib.startup
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @owner Phillip Lee
 *
 * @author Josh Kaplan
 *
 * @description Prints an MBEE startup logo.
 */

// Define colors in logo
const colors = {
  grey: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  light_grey: '\u001b[37m',
  esc: '\u001b[39m'
};

// Define the primary and secondary colors
const primary = colors.green;
const secondary = colors.grey;

// Create the logo
const logo = {};
logo['1'] = `${primary}███${secondary}╗${primary
}   ███${secondary}╗${primary}██████${secondary}╗${
  primary} ███████${secondary}╗${primary}███████${secondary}╗${
  colors.esc}`;
logo['2'] = `${primary}████${secondary}╗${primary} ████${
  secondary}║${primary}██${secondary}╔══${primary
}██${secondary}╗${primary}██${secondary}╔════╝${
  primary}██${secondary}╔════╝${colors.esc}`;
logo['3'] = `${primary}██${secondary}╔${primary}████${secondary
}╔${primary}██${secondary}║${primary}██████${
  secondary}╔╝${primary}█████${secondary}╗${
  primary}  █████${secondary}╗  ${
  colors.esc}`;
logo['4'] = `${primary}██${secondary}║╚${primary}██${secondary}╔╝${
  primary}██${secondary}║${primary}██${secondary}╔══${
  primary}██${secondary}╗${primary}██${secondary}╔══╝  ${
  primary}██${secondary}╔══╝  ${
  colors.esc}`;
logo['5'] = `${primary}██${secondary}║ ╚═╝ ${primary}██${secondary
}║${primary}██████${secondary}╔╝${primary}███████${
  secondary}╗${primary}███████${secondary}╗${
  colors.esc}`;
logo['6'] = `${secondary}╚═╝     ╚═╝╚═════╝ ╚══════╝╚══════╝${
  colors.esc}`;

const image = {};
image['1'] = '\u001b[33m';
image['2'] = '              \u001b[30m\\     /\u001b[39m                  ';
image['3'] = '          \u001b[30m\\\u001b[39m    o \u001b[33m^\u001b[39m o    \u001b[30m/\u001b[39m              ';
image['4'] = '            \u001b[30m\\\u001b[39m \u001b[33m(     ) \u001b[30m/\u001b[39m                ';
image['5'] = `\u001b[39m ____________\u001b[33m(%%%%%%%)\u001b[39m____________     ${logo['1']}`;
image['6'] = `(     /   /  )\u001b[33m%%%%%%%\u001b[39m(  \\   \\     )    ${logo['2']}`;
image['7'] = `(___/___/__/           \\__\\___\\___)    ${logo['3']}`;
image['8'] = `   (     /  /\u001b[33m(%%%%%%%)\u001b[39m\\  \\     )       ${logo['4']}`;
image['9'] = `    (__/___/ \u001b[33m(%%%%%%%)\u001b[39m \\___\\__)        ${logo['5']}`;
image['10'] = `            \u001b[30m/\u001b[33m(       )\u001b[39m\u001b[30m\\\u001b[39m                ${logo['6']}`;
image['11'] = '          \u001b[30m/   \u001b[33m(%%%%%)\u001b[39m   \u001b[30m\\\u001b[39m              ';
image['12'] = '               \u001b[33m(%%%)\u001b[39m                   ';
image['13'] = '                 \u001b[33m!\u001b[39m                     ';
image['14'] = '\u001b[39m';

/**
 * @description Print the logo to the console.
 */
function printLogo() {
  console.log(image['1']);  // eslint-disable-line no-console
  console.log(image['2']);  // eslint-disable-line no-console
  console.log(image['3']);  // eslint-disable-line no-console
  console.log(image['4']);  // eslint-disable-line no-console
  console.log(image['5']);  // eslint-disable-line no-console
  console.log(image['6']);  // eslint-disable-line no-console
  console.log(image['7']);  // eslint-disable-line no-console
  console.log(image['8']);  // eslint-disable-line no-console
  console.log(image['9']);  // eslint-disable-line no-console
  console.log(image['10']); // eslint-disable-line no-console
  console.log(image['11']); // eslint-disable-line no-console
  console.log(image['12']); // eslint-disable-line no-console
  console.log(image['13']); // eslint-disable-line no-console
  console.log(image['14']); // eslint-disable-line no-console
}

module.exports = printLogo;
