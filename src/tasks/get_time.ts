import {program} from 'commander';
import * as moment from 'moment';
import {Task} from '../core/task';

class GetTime extends Task<void> {
  constructor(private readonly format: string) {
    super('TIME');
  }

  protected override execute(): Promise<void> {
    this.logger.info(`Current time: ${moment().format(this.format)}`);
    return Promise.resolve();
  }
}

const cmdGetTime = program
  .createCommand('time')
  .description('Get current time')
  .option(
    '-f, --format <format>',
    'Format, exp: YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm:ss'
  )
  .action(async options => {
    const obj = new GetTime(options.format);
    await obj.run();
  });

export default cmdGetTime;
