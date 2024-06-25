import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as colors from 'colors';
import { Task } from '../../core/task';

export enum FileState {
  A = 'A',
  M = 'M',
  D = 'D'
};

export enum SortType {
  name = 'name',
  state = 'state'
};

export interface GitFile {
  path: path.ParsedPath;
  state: FileState
};

class XGitChange extends Task<void> {

  private readonly git: SimpleGit;

  constructor(
    private distPath: string | null,
    private sortType: SortType = SortType.name
  ) {
    super('XGit');
    if (!sortType) {
      sortType = SortType.name;
    }
    const options: Partial<SimpleGitOptions> = {
      baseDir: process.cwd(),
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false,
    };
    this.git = simpleGit(options);
  }

  protected override async execute(): Promise<void> {
    const files = await this.getFiles();
    this.logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    files.forEach(f => {
      let msg = `${f.state}: ${path.join(f.path.dir, f.path.base)}`;
      if (f.state == FileState.A) {
        msg = colors.blue(msg);
      } else if (f.state == FileState.M) {
        msg = colors.yellow(msg);
      } else if (f.state == FileState.D) {
        msg = colors.red(msg);
      }
      this.logger.info(msg);
    });
    this.logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    if (this.distPath !== undefined) {
      const dirRoot = this.distPath ? this.distPath : '../git-modified';
      // Create root folder
      if (fs.existsSync(dirRoot)) {
        fs.rmSync(dirRoot, { force: true, recursive: true });
      }
      fs.mkdirSync(dirRoot, { recursive: true });
      // Create child folder
      files
        .filter(f => f.state != FileState.D)
        .map(f => {
          return path.join(dirRoot, f.path.dir);
        })
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .forEach(p => {
          if (!fs.existsSync(p)) {
            fs.mkdirSync(p, { recursive: true });
          }
        });
      // Copy file
      files
        .filter(f => f.state != FileState.D)
        .forEach(f => {
          const from = path.join(f.path.dir, f.path.base);
          const to = path.join(dirRoot, f.path.dir, f.path.base);
          fs.cpSync(from, to);
        });
      this.logger.info(`✈ ✈ ✈ 【${dirRoot}】`);
    }
    return Promise.resolve();
  }

  protected async getFiles(): Promise<GitFile[]> {
    const result = await this.git.status();
    const files = [
      ...result.created.map(f => ({ file: f, state: FileState.A })),
      ...result.not_added.map(f => ({ file: f, state: FileState.A })),
      ...result.modified.map(f => ({ file: f, state: FileState.M })),
      ...result.deleted.map(f => ({ file: f, state: FileState.D })),
      ...result.renamed.map(f => ({ file: f.from, state: FileState.D })),
      ...result.renamed.map(f => ({ file: f.to, state: FileState.A })),
    ];

    return Array.from(new Set(files.map(f => f.file)))
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map(file => {
        return { file, state: files.find(f => f.file == file)?.state ?? FileState.A };
      })
      .sort((a, b) => {
        if (this.sortType == SortType.name) {
          return a.file > b.file ? 1 : -1;
        }
        if (this.sortType == SortType.state) {
          if (a.state == b.state) {
            return a.file > b.file ? -1 : 1;
          }
          if (a.state == FileState.A) {
            return -1;
          }
          if (a.state == FileState.M) {
            return b.state == FileState.A ? 1 : -1;
          }
          if (a.state == FileState.D) {
            return 1;
          }
          return 0;
        }
        return 0;
      })
      .map(f => ({ path: path.parse(f.file), state: f.state }));
  }
}

const cmdGitChange = program
  .createCommand('change')
  .description('Get modified files')
  .option('-cp, --copy <copy>', 'Folder path')
  .option('-s, --sort <sort>', 'Sort type: name | state', 'name')
  .action(async (options: { copy: string | null, sort: SortType }) => {
    const obj = new XGitChange(options.copy, SortType[options.sort]);
    await obj.run();
  });

export default cmdGitChange;
