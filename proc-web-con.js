'use strict';

const http = require("http");
const express = require("express");
const execSync = require('child_process').execSync;

const COMMAND_OPTION_VERBOSE_MODE = '-v';
const COMMAND_OPTION_HELP = '-h';
const COMMAND_OPTION_CONFIG = '-c';

const DEFAULT_USER_CONFIG_PATH = './user_config.yaml';
const DEFAULT_EJS_NAME = 'proc-web-con';
const DEFAULT_TITLE_STYLE = 'dark';
const DEFAULT_BUTTON_STYLE = 'primary';
const DEFAULT_LISTEN_PORT = 3000;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_EXECUTING_MESSAGE = 'Executing...';
const DEFAULT_PROCESS_RUNNING_MESSAGE = 'ProcessStatus: Running';
const DEFAULT_PROCESS_STOPPING_MESSAGE = 'ProcessStatus: Stopping';
const DEFAULT_OS_REBOOT_SHUTDOWN_TITLE = 'OS Reboot/Shutdown';
const DEFAULT_OS_REBOOT_SHUTDOWN_BUTTON_STYLE = 'danger';
const DEFAULT_REFRESH_BUTTON_NAME = 'Refresh';
const DEFAULT_REBOOT_BUTTON_NAME = 'Reboot';
const DEFAULT_REBOOT_CONFIRM_MESSAGE = 'Reboot OK?';
const DEFAULT_REBOOT_CMD = 'sudo reboot';
const DEFAULT_SHUTDOWN_BUTTON_NAME = 'Shutdown';
const DEFAULT_SHUTDOWN_CONFIRM_MESSAGE = 'Shutdown OK?';
const DEFAULT_SHUTDOWN_CMD = 'sudo shutdown -h now';

const WAIT_TIME_BEFORE_REFRESH = 1000;

// default config path
let userConfigPath = DEFAULT_USER_CONFIG_PATH;

// analyzes command line options
global.enabledLogging = false;
let paramList = [];
let paramCnt = 0;
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === COMMAND_OPTION_VERBOSE_MODE) {
    global.enabledLogging = true;
  } else if (process.argv[i] === COMMAND_OPTION_CONFIG) {
    if (i + 1 >= process.argv.length) {
      usage();
    }
    userConfigPath = process.argv[i + 1];
  } else if (process.argv[i] === COMMAND_OPTION_HELP) {
    usage();
  } else {
    paramList.push(process.argv[i]);
  }
}

// default parameter
loadUserConfig(userConfigPath);
let userConfig = global.userConfig;

let ejsName = DEFAULT_EJS_NAME;
if (userConfig.ejsName) {
  ejsName = userConfig.ejsName;
}

let titleStyle = DEFAULT_TITLE_STYLE;
if (userConfig.titleStyle) {
  titleStyle = userConfig.titleStyle;
}

let buttonStyle = DEFAULT_BUTTON_STYLE;
if (userConfig.buttonStyle) {
  buttonStyle = userConfig.buttonStyle;
}

let listenPort = DEFAULT_LISTEN_PORT;
if (userConfig.listenPort && !isNaN(userConfig.listenPort)) {
  listenPort = userConfig.listenPort;
}

let executingMessage = DEFAULT_EXECUTING_MESSAGE;
if (userConfig.executingMessage) {
  executingMessage = userConfig.executingMessage;
}

let refreshButtonName = DEFAULT_REFRESH_BUTTON_NAME;
if (userConfig.refreshButtonName) {
  refreshButtonName = userConfig.refreshButtonName;
}
let processStatusMessageList = []
if (userConfig.processRunningMessage && userConfig.processStoppingMessage) {
  processStatusMessageList.push(userConfig.processRunningMessage);
  processStatusMessageList.push(userConfig.processStoppingMessage);
} else {
  processStatusMessageList.push(DEFAULT_PROCESS_RUNNING_MESSAGE);
  processStatusMessageList.push(DEFAULT_PROCESS_STOPPING_MESSAGE);
}

let osRebootShutdownTitle = DEFAULT_OS_REBOOT_SHUTDOWN_TITLE;
if (userConfig.osRebootShutdownTitle) {
  osRebootShutdownTitle = userConfig.osRebootShutdownTitle;
}
let osRebootShutdownButtonStyle = DEFAULT_OS_REBOOT_SHUTDOWN_BUTTON_STYLE;
if (userConfig.osRebootShutdownButtonStyle) {
  osRebootShutdownButtonStyle = userConfig.osRebootShutdownButtonStyle;
}
let rebootButtonName = DEFAULT_REBOOT_BUTTON_NAME;
if (userConfig.rebootButtonName) {
  rebootButtonName = userConfig.rebootButtonName;
}
let rebootConfirmMessage = DEFAULT_REBOOT_CONFIRM_MESSAGE;
if (userConfig.rebootConfirmMessage) {
  rebootConfirmMessage = userConfig.rebootConfirmMessage;
}
let rebootCmd = DEFAULT_REBOOT_CMD;
if (userConfig.rebootCmd) {
  rebootCmd = userConfig.rebootCmd;
}
let shutdownButtonName = DEFAULT_SHUTDOWN_BUTTON_NAME;
if (userConfig.shutdownButtonName) {
  shutdownButtonName = userConfig.shutdownButtonName;
}
let shutdownConfirmMessage = DEFAULT_SHUTDOWN_CONFIRM_MESSAGE;
if (userConfig.shutdownConfirmMessage) {
  shutdownConfirmMessage = userConfig.shutdownConfirmMessage;
}
let shutdownCmd = DEFAULT_SHUTDOWN_CMD;
if (userConfig.shutdownCmd) {
  shutdownCmd = userConfig.shutdownCmd;
}

let itemMap = new Map();
itemMap.set('title', userConfig.title);
itemMap.set('titleStyle', titleStyle);
itemMap.set('buttonStyle', buttonStyle);
itemMap.set('executingMessage', executingMessage);
itemMap.set('executingFlag', false);
itemMap.set('osRebootShutdownTitle', osRebootShutdownTitle);
itemMap.set('osRebootShutdownButtonStyle', osRebootShutdownButtonStyle);
itemMap.set('refreshButtonName', refreshButtonName);
itemMap.set('rebootButtonName', rebootButtonName);
itemMap.set('rebootConfirmMessage', rebootConfirmMessage);
itemMap.set('shutdownButtonName', shutdownButtonName);
itemMap.set('shutdownConfirmMessage', shutdownConfirmMessage);
itemMap.set('commandsTitle', userConfig.commandsTitle);
itemMap.set('monitoringResult', '');
let commandButtonList = [];
for (let command of global.commandList) {
  commandButtonList.push(command.name); 
}
itemMap.set('commandButtons', commandButtonList);

(async () => {
  let app = express();
  app.set("view engine", "ejs");
  app.set("views", __dirname);

  app.get("/", async function (req, res) {
    checkProcess(itemMap, processStatusMessageList);
    return res.render(ejsName, Object.fromEntries(itemMap));
  });

  app.get("/command", async function (req, res) {
    let commandNum = Number(req.query.command_num);
    let command = global.commandList[commandNum];
    let cmd = command.cmd;
    let dir = command.dir;
    let timeout = command.timeout;
    if (!timeout) {
      timeout = DEFAULT_TIMEOUT;
    }
    logging('cmd: ' + cmd + ', dir: ' + dir + ', timeout: ' + timeout);
    try {
      var result = '';
      if (dir) {
        result = execSync(cmd, {cwd: dir, timeout: timeout}).toString(); 
      } else {
        result = execSync(cmd, {timeout: timeout}).toString(); 
      }
      logging('result: ' + result);
    } catch (error) {
      logging('error occured. cmd: ' + cmd);
      logging(error);
    }
    await sleep(WAIT_TIME_BEFORE_REFRESH);
    checkProcess(itemMap, processStatusMessageList);
    return res.render(ejsName, Object.fromEntries(itemMap));
  });

  app.get("/refresh", async function (req, res) {
    checkProcess(itemMap, processStatusMessageList);
    return res.render(ejsName, Object.fromEntries(itemMap));
  });

  app.get("/reboot", async function (req, res) {
    try {
      logging('reboot cmd: ' + rebootCmd);
      res.redirect('/');
      var result = '';
      result = execSync(rebootCmd).toString(); 
    } catch (error) {
      logging(error);
    }
  });

  app.get("/shutdown", async function (req, res) {
    try {
      logging('shutdown cmd: ' + shutdownCmd);
      res.redirect('/');
      var result = '';
      result = execSync(shutdownCmd).toString(); 
    } catch (error) {
      logging(error);
    }
  });

  var server = http.createServer(app);
  server.listen(listenPort);
  console.log('Server started. ListenPort: ' + listenPort);

})();

function sleep(waitTime) {
  return new Promise(function (resolve) {
    setTimeout(function() { resolve() }, waitTime);
  });
} 

function checkProcess(itemMap, processStatusMessageList) {
  try {
    let processName = userConfig.processName;
    const result = execSync('ps -ef | grep "' + processName + '" | grep -v grep'); 
    logging(result.toString());
    itemMap.set('processStatusMessage', processStatusMessageList[0]);
  } catch (error) {
    itemMap.set('processStatusMessage', processStatusMessageList[1]);
  }

  checkOSStat(itemMap);
}

function checkOSStat(itemMap) {
  try {
    let monitoringCmd = userConfig.monitoringCmd;
    if (monitoringCmd) {
      let result = execSync(monitoringCmd).toString(); 
      logging(result.toString());
      result = result.replace(/\n/g, '<br/>'); 
      logging(result);
      itemMap.set('monitoringResult', result);
    }
  } catch (error) {
    logging(error);
    itemMap.set('monitoringResult', '');
  }
}

function loadYamlFile(fileName) {
  const fs = require('fs');
  let existsFile = fs.existsSync(fileName);
  if (!existsFile) {
    console.error('File not found. filePath: ' + fileName);
    process.exit(1);
  }
  const yaml = require('js-yaml');
  const yamlText = fs.readFileSync(fileName, 'utf8');
  return yaml.load(yamlText);
}

function loadUserConfig(userConfigPath) {
  let userConfigPathWork = userConfigPath;
  if (userConfigPathWork === undefined) {
    userConfigPathWork = DEFAULT_USER_CONFIG_PATH;
  }
  const path = require('path');
  const config = loadYamlFile(path.join(__dirname, userConfigPathWork));
  global.userConfig = config;

  let commandList = [];
  for (const command of config.commands) {
    commandList.push(new _command(
      command.name,
      command.cmd,
      command.dir,
      command.timeout
    ));
  }
  global.commandList = commandList;
}

function _command(name, cmd, dir, timeout) {
  this.name = name;
  this.cmd = cmd;
  this.dir = dir;
  this.timeout = timeout;
}

function logging(message) {
  if (global.enabledLogging) {
    const nowDate = new Date();
    console.log('[' + getFormattedDateTime(nowDate) + '] ' + message);
  }
}

function getFormattedDateTime(date) {
  let dateString =
    date.getFullYear() + '/' +
    ('0' + (date.getMonth() + 1)).slice(-2) + '/' +
    ('0' + date.getDate()).slice(-2) + ' ' +
    ('0' + date.getHours()).slice(-2) + ':' +
    ('0' + date.getMinutes()).slice(-2) + ':' +
    ('0' + date.getSeconds()).slice(-2);
  return dateString;
}

function usage() {
  console.log('usage: proc-web-con.js [-options]');
  console.log('    -c <pathname> specifies a config file path (default is ./user_config.yaml)');
  console.log('    -v            verbose mode');
  console.log('    -h            display this help');
  process.exit(0);
}

