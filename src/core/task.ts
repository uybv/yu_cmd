import * as winston from 'winston';
import {loggerInit} from './logger';

export interface ITask<T> {
  run(): Promise<T>;
}

export abstract class Task<T> implements ITask<T> {
  protected readonly logger: winston.Logger;

  constructor(private readonly name: string) {
    this.logger = loggerInit(this.name);
  }

  async run(): Promise<T> {
    //this.logger.info('============ [BEGIN] ==========');
    const result = await this.execute();
    //this.logger.info('============ [END] ============');
    return result;
  }

  protected async execute(): Promise<T> {
    throw new Error('Method not implemented.');
  }
}
