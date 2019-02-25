/**
 * Classification: UNCLASSIFIED
 *
 * @module plugins.routes
 *
 * @copyright Copyright (C) 2018, Lockheed Martin Corporation
 *
 * @license MIT
 *
 * @description This file implements the plugin loading and routing logic.
 */

// Node modules
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// NPM Modules
const express = require('express');
const pluginRouter = express.Router();

const protectedFileNames = ['routes.js'];
const mbeeDependencies = require(`${M.root}/package.json`).dependencies;
const mbeeDepList = Object.keys(mbeeDependencies);

// Load the plugins
loadPlugins();

/**
 * Actually loads the plugins by copying them from their source location into
 * the plugins directory, then loops over those plugins to "require" them and
 * use them as part of the plugins routes.
 */
function loadPlugins() {
  const loadedPlugins = [];

  // Clone or copy plugins from their source into the plugins directory
  for (let i = 0; i < M.config.server.plugins.plugins.length; i++) {
    const data = M.config.server.plugins.plugins[i];
    // Git repos
    if (data.source.endsWith('.git')) {
      clonePluginFromGitRepo(data);
    }
    // Local plugins
    else if (data.source.startsWith('/') || data.source.startsWith('.')) {
      copyPluginFromLocalDir(data);
    }
    // Website downloads
    else if (data.source.endsWith('.zip') || data.source.endsWith('.gz')) {
      downloadPluginFromWebsite(data);
    }
    else {
      M.log.warn('Plugin type unknown');
    }
  }

  // List the contents of the plugins directory
  const files = fs.readdirSync(__dirname);

  // Get a list of plugin names in the config
  const pluginName = M.config.server.plugins.plugins.map(plugin => plugin.name);

  files.forEach((f) => {
    // Skip routes.js
    if (protectedFileNames.includes(f)) {
      return;
    }

    // Removes old plugins
    if (!pluginName.includes(f)) {
      M.log.info(`Removing plugin '${f}' ...`);
      const c = `rm -rf ${__dirname}/${f}`;
      const stdout = execSync(c);
      M.log.verbose(stdout.toString());
    }
    // If package.json doesn't exist, it is not a valid plugin. Skip it.
    const pluginPath = path.join(__dirname, f);
    if (!fs.existsSync(path.join(pluginPath, 'package.json'))) {
      M.log.info(`Removing invalid plugin '${f}' ...`);
      const c = `rm -rf ${__dirname}/${f}`;
      const stdout = execSync(c);
      M.log.verbose(stdout.toString());
      return;
    }

    // Load plugin metadata
    const pkg = require(path.join(pluginPath, 'package.json')); // eslint-disable-line global-require
    const entrypoint = path.join(pluginPath, pkg.main);
    const namespace = f.toLowerCase();
    M.log.info(`Loading plugin '${namespace}' ...`);

    // Install the dependencies
    const dependencies = pkg.dependencies;
    if (dependencies) {
      M.log.verbose('Installing plugin dependencies ...');
      // Loop through plugin dependencies
      Object.keys(dependencies).forEach(dep => {
        // Skip conflicting dependencies
        if (mbeeDepList.includes(dep)) {
          return;
        }
        // Add dependency to node_modules without erasing existing node_modules
        // directory
        const commands = [
          `pushd ${pluginPath}; yarn install; popd;`
        ];
        M.log.verbose(`Installing dependency ${dep} ...`);
        const stdout = execSync(commands.join('; '));
        M.log.debug(stdout.toString());
        M.log.verbose(`${dep} installed.`);
      });
    }


    // Try: creates the plug-in path with the plug-in name
    try {
      pluginRouter.use(`/${namespace}`, require(entrypoint)); // eslint-disable-line global-require
    }
    // If try fails,
    // Catch: logs "Could not install plugin" along with the error
    catch (err) {
      M.log.error(`Could not install plugin ${namespace}, error:`);
      M.log.error(err);
      return;
    }
    M.log.info(`Plugin ${namespace} installed.`);

    // Add plugin name/title to array of loaded plugins
    loadedPlugins.push({
      name: namespace,
      title: M.config.server.plugins.plugins.filter(p => p.name === namespace)[0].title
    });
  });

  // Export list of loaded plugins
  module.exports.loadedPlugins = loadedPlugins;
}

/**
 * @description Clones the plugin from a Git repository and places in the
 * appropriate location in the plugins directory.
 *
 * @param {Object} data The plugin configuration data
 */
function clonePluginFromGitRepo(data) {
  // Remove plugin if it already exists in plugins directory
  const rmDirCmd = (process.platform === 'win32') ? 'rmdir /s' : 'rm -rf';
  const stdoutRmCmd = execSync(`${rmDirCmd} ${path.join(M.root, 'plugins', data.name)}`);
  M.log.verbose(stdoutRmCmd.toString());

  // Set deploy key file permissions
  let deployKeyCmd = '';
  if (data.hasOwnProperty('deployKey')) {
    execSync(`chmod 400 ${data.deployKey}`);
    deployKeyCmd = `GIT_SSH_COMMAND="ssh -i ${data.deployKey} -oStrictHostKeyChecking=no" `;
  }

  let version = '';
  // Clone a specific version
  if (data.hasOwnProperty('version')) {
    // Disables a warning about detachedHead
    execSync('git config --global advice.detachedHead false');
    version = `--branch ${data.version} `;
  }

  // Create the git clone command
  const cmd = `${deployKeyCmd}git clone ${version}${data.source} `
            + `${path.join(M.root, 'plugins', data.name)}`;

  // Clone the repo
  M.log.info(`Cloning plugin ${data.name} from ${data.source} ...`);
  const stdout2 = execSync(cmd);
  M.log.verbose(stdout2.toString());
  M.log.info('Clone complete.');
}

/**
 * @description Copies the plugin from a local directory to the plugins
 * directory. If the plugin location is already in the local directory, nothing
 * occurs.
 *
 * @param {Object} data The plugin configuration data
 */
function copyPluginFromLocalDir(data) {
  // Remove plugin if it already exists in plugins directory
  const rmDirCmd = (process.platform === 'win32') ? 'rmdir /s' : 'rm -rf';
  const stdoutRmCmd = execSync(`${rmDirCmd} ${path.join(M.root, 'plugins', data.name)}`);
  M.log.verbose(stdoutRmCmd.toString());

  // Generate the copy command
  let cmd = (process.platform === 'win32') ? 'xcopy /E' : 'cp -r ';
  cmd = `${cmd} ${data.source} ${path.join(M.root, 'plugins', data.name)}`;

  // Execute the copy command
  M.log.info(`Copying plugin ${data.name} from ${data.source} ...`);
  const stdout = execSync(cmd);
  M.log.verbose(stdout.toString());
  M.log.info('Copy complete');
}

/**
 * @description Copies the plugin from a website to the plugins
 * directory. If the plugin location is already in the local directory, nothing
 * occurs.
 *
 * @param {Object} data - The plugin configuration data
 */
function downloadPluginFromWebsite(data) {
  // Remove plugin if it already exists in plugins directory
  const rmDirCmd = (process.platform === 'win32') ? 'rmdir /s' : 'rm -rf';
  const stdoutRmCmd = execSync(`${rmDirCmd} ${path.join(M.root, 'plugins', data.name)}`);
  M.log.verbose(stdoutRmCmd.toString());

  // Proxy information
  const httpProxy = M.config.server.proxy;

  // Create directory for plugin
  const dirName = path.join(M.root, 'plugins', data.name);
  const stdoutMkdirCmd = execSync(`mkdir -p ${dirName}`);
  M.log.verbose(stdoutMkdirCmd.toString());

  // Setting parameters
  let fileName = null;
  let unzipCmd = null;

  // .zip files
  if (data.source.endsWith('.zip')) {
    // Set name and unzip command
    fileName = `${path.join(M.root, 'plugins', data.name)}/${data.name}.zip`;
    unzipCmd = `unzip ${fileName} -d ${dirName}`;
  }
  // .tar.gz files
  else if (data.source.endsWith('.tar.gz')) {
    // Set name and unzip command
    fileName = `${path.join(M.root, 'plugins', data.name)}/${data.name}.tar.gz`;
    unzipCmd = `tar xvzf ${fileName} -C ${dirName}`;
  }
  // .gz files
  else if (data.source.endsWith('.gz')) {
    // Set name and unzip command
    fileName = `${path.join(M.root, 'plugins', data.name)}/${data.name}.gz`;
    unzipCmd = `gunzip -c ${fileName} > ${dirName}`;
  }
  // Other files
  else {
    M.log.info('File is not an accepted download option.');
    return;
  }

  // Downloading from website
  M.log.info(`Downloading plugin ${data.name} from ${data.source} ...`);
  const curlCmd = `curl -L -k -XGET -x ${httpProxy} ${data.source} --output ${fileName}`;
  const stdoutCurl = execSync(curlCmd);
  M.log.verbose(stdoutCurl.toString());
  M.log.info('Download complete.');

  // Extracting downloaded file
  M.log.info(`Extracting ${fileName}...`);
  const execCmd = execSync(unzipCmd);
  M.log.verbose(execCmd.toString());
  M.log.info('Extraction complete.');
}

module.exports.router = pluginRouter;
