#! /usr/bin/env node

import * as dotenv from 'dotenv';
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({path: envFile});

import {program} from 'commander';
import cmdGetTime from './tasks/get_time';
import cmdYoutube from './tasks/ytb_download';

program.name('yu').version('1.0.0');

program.addCommand(cmdGetTime);
program.addCommand(cmdYoutube);

program.parse(process.argv);
