import * as winston from 'winston';
import 'winston-daily-rotate-file';

const {combine, timestamp, printf, colorize, errors, label} = winston.format;

const customMessage = printf(({level, message, timestamp, stack, label}) => {
  if (stack) {
    return `${timestamp} [${level}]: ${message} \r\n ${stack}`;
  }
  return `[${label}]: ${message}`;
});

const loggerInit = (name: string): winston.Logger => {
  return winston.createLogger({
    level: process.env.LOGGER_LEVEL || 'debug',
    transports: [
      new winston.transports.Console({
        format: combine(
          timestamp(),
          label({label: name}),
          errors({stack: true}),
          colorize({all: true}),
          customMessage
        ),
      }),
      /*
      new winston.transports.DailyRotateFile({
        format: combine(timestamp(), errors({stack: true}), customMessage),
        dirname: 'logs',
        filename: name + '_%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '3d',
      }),
      */
    ],
  });
};

export {loggerInit};
