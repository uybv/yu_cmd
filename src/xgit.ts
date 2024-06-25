#! /usr/bin/env node

import * as dotenv from 'dotenv';
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({path: envFile});

import {program} from 'commander';
import cmdGit from './tasks/xgit';

program.name('xgit').version('1.0.0');

cmdGit.commands.forEach(cmd => {
    program.addCommand(cmd);
});

program.parse(process.argv);
