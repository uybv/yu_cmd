#! /usr/bin/env node

import * as dotenv from 'dotenv';
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({path: envFile});

import {program} from 'commander';
import cmdYoutube from './tasks/ytb_download';

program.name('ytb').version('1.0.0');

cmdYoutube.commands.forEach(cmd => {
    program.addCommand(cmd);
});

program.parse(process.argv);
