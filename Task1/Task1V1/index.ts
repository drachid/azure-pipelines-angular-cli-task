import tl = require('azure-pipelines-task-lib/task');
import { exec, ExecException } from 'child_process';

interface CommandOutput {
  stdout: string;
  stderr?: string;
  error?: ExecException;
}

//this function will check if @angular/cli is available
async function validateNg(folder: string, onSuccess: Function, onError: Function) {
  exec('npx ng version',
    {
      encoding: "UTF-8",
      cwd: folder
    },
    (error, stdout, stderr) => {
      if (error !== null) {
        console.error(`exec error: ${error}`);
        console.error(`Angular CLI NOT found`);
        onError();
      } else {
        const versionRegex = /Angular CLI: (\d+.\d+.\d+)/;
        let m;
        if ((m = versionRegex.exec(stdout.toString())) !== null) {
          // The result can be accessed through the `m`-variable.
          console.log(`Using Angular CLI ${m[1]}`);
        }
        onSuccess();
      }
    });
}

function execute(command: string, cwd: string, onSuccess: Function, onError: Function) {
  return exec(command,
    {
      encoding: "UTF-8",
      cwd: cwd
    }, (error, stdout, stderr) => {
      if (error !== null) {
        console.error(`exec error: ${error}`);
        onError(error, stderr);
      } else {
        onSuccess(stdout);
      }
    });
}

async function run() {
  try {
    const command: string | undefined = tl.getInput('command', true);
    const project: string | undefined = tl.getInput('project', false) || '.';
    const custom: string | undefined = tl.getInput('custom', false);
    let args: string | undefined = tl.getInput('arguments', false) || '';
    const debug: boolean = tl.getBoolInput('debug', false);
    const verbose: boolean = tl.getBoolInput('verbose', false);
    const isProd: boolean = tl.getBoolInput('prod', false);

    if (command == 'bad') {
      tl.setResult(tl.TaskResult.Failed, 'Bad command was given');
      return;
    }

    if (verbose) {
      if (command === 'build' && args.indexOf('--verbose') === -1) {
        let argsArray = args.split(' ');
        argsArray.push('--verbose');
        args = argsArray.join(' ');
      }
    }

    if (command === 'test' && args.indexOf('--watch') === -1) {
      let argsArray = args.split(' ');
      argsArray.push('--watch=false');
      args = argsArray.join(' ');
    } else if (command == 'build' && isProd && args.indexOf('--prod') === -1) {
      let argsArray = args.split(' ');
      argsArray.push('--prod');
      args = argsArray.join(' ');
    }

    if (debug) {
      console.log(custom || command, project, args, debug, verbose);
    }

    validateNg(project, () => {
      console.log(`Executing ng ${custom || command} ${args}`);
      execute(`ng ${custom || command} ${args}`, project, (output: string) => {
        console.log(`Output (ng ${custom || command} ${args}):`, output);
      }, (error: ExecException, stderror: string) => {
        console.error(`There was an error: ${stderror}`, error);
      }).on('exit', code => {
        if (code == 1) {
          tl.setResult(tl.TaskResult.Failed, `ng ${custom || command} ${args} returned exit code 1`);
        }
      });
    }, () => {
      console.error('Angular CLI was not found.\nRemember to perform "npm install" before using the steps of the Angular CLI extension.\nAngular CLI extensions uses @angular/cli package located in the node_modules folder of an Angular application.\nIf you still have issue or doubts you can open a ticket in https://github.com/alexruizprado/azure-pipelines-angular-cli-task under Issues.');
      tl.setResult(tl.TaskResult.Failed, 'Angular CLI was not found.\nRemember to perform "npm install" before using the steps of the Angular CLI extension.\nAngular CLI extensions uses @angular/cli package located in the node_modules folder of an Angular application.\nIf you still have issue or doubts you can open a ticket in https://github.com/alexruizprado/azure-pipelines-angular-cli-task under Issues.');
      return;
    });
  }
  catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();