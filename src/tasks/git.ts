import {program} from 'commander';
import {Task} from '../core/task';
import {execSync} from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

type ACTION = 'modified-show' | 'modified-copy';
type OPTIONS = {
  dir?: string;
};

class Git extends Task<void> {
  constructor(
    private readonly action: ACTION = 'modified-show',
    private readonly options: OPTIONS = {}
  ) {
    super('GIT');
  }

  protected override execute(): Promise<void> {
    if (this.action === 'modified-copy') {
      const files = this.getModifiedFiles();
      const dirRoot = this.options?.dir ?? '../git-modified';
      // Create root folder
      if (fs.existsSync(dirRoot)) {
        fs.rmSync(dirRoot, {force: true, recursive: true});
      }
      fs.mkdirSync(dirRoot, {recursive: true});
      // Create child folder
      files
        .map(f => {
          return path.join(dirRoot, f.dir);
        })
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .forEach(p => {
          if (!fs.existsSync(p)) {
            fs.mkdirSync(p, {recursive: true});
          }
        });
      // Copy file
      this.logger.info('Copied:');
      files.forEach(f => {
        const from = path.join(f.dir, f.base);
        const to = path.join(dirRoot, f.dir, f.base);
        fs.cpSync(from, to);
        this.logger.info(`    ◇ ${from}`);
      });
      this.logger.info(`↬ ${dirRoot}`);
    } else if (this.action === 'modified-show') {
      const files = this.getModifiedFiles();
      this.logger.info('Modified files: ');
      files.forEach(f => {
        this.logger.info(`    ◇ ${path.join(f.dir, f.base)}`);
      });
    }
    return Promise.resolve();
  }

  protected getModifiedFiles(): path.ParsedPath[] {
    const cmd = 'git ls-files --modified';
    const output = execSync(cmd).toString();
    return output
      .split('\n')
      .filter(Boolean)
      .map(f => path.parse(f));
  }
}

const cmdGitModifiedCopy = program
  .createCommand('cp')
  .description('Copy modified files to new folder')
  .option('-d, --dir <dir>', 'Folder path', '../git-modified')
  .action(async (options: {dir: string}) => {
    const obj = new Git('modified-copy', options);
    await obj.run();
  });

const cmdGitModified = program
  .createCommand('modified')
  .description('Get modified files')
  .addCommand(cmdGitModifiedCopy)
  .action(async () => {
    const obj = new Git('modified-show');
    await obj.run();
  });

const cmdGit = program
  .createCommand('git')
  .description('Git Tools')
  .addCommand(cmdGitModified);
export default cmdGit;
