import {program} from 'commander';
import cmdGitChange from './xgit/git-change';

const cmdGit = program
  .createCommand('git')
  .description('Git Tools')
  .addCommand(cmdGitChange)
export default cmdGit;
