import {program} from 'commander';
import * as ytdl from 'ytdl-core';
import {Task} from '../core/task';
import {Exception} from '../core/exception';
import {YoutubeUtil} from './ytb_download/util';
import {CliProgress} from '../core/progress';

type TYPE_ACTION = 'download' | 'check';
type TYPE_FORMAT = 'audio' | 'video';

class YoutubeDownload extends Task<void> {
  private readonly progress = new CliProgress();

  constructor(
    private readonly action: TYPE_ACTION,
    private readonly url: string,
    private readonly format: TYPE_FORMAT = 'video',
    private readonly convert: boolean = false
  ) {
    super('YOUTUBE');
  }

  private get urlException(): Exception {
    return new Exception(`URL: [${this.url}] invalid!`);
  }

  private get isValid(): boolean {
    return ytdl.validateURL(this.url);
  }

  private sizeDisplay(size: number): string {
    if (Number.isNaN(size)) {
      return '???';
    } else if (size < 1024) {
      return `${size}byte`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)}kb`;
    } else {
      return `${(size / 1024 / 1024).toFixed(2)}mb`;
    }
  }

  private timeDisplay(length: number): string {
    if (Number.isNaN(length)) {
      return '???';
    }
    const h = Math.floor(length / 60 / 60);
    const m = Math.floor(length / 60) % 60;
    const s = length % 60;
    if (h > 0) {
      return `${h}h${m}m${s}s`;
    } else if (m > 0) {
      return `${m}m${s}s`;
    } else {
      return `${s}s`;
    }
  }

  private async downloadAudio(info: ytdl.videoInfo): Promise<string> {
    const format = info.formats.find(fm => {
      return (
        fm.hasAudio &&
        !fm.hasVideo &&
        fm.container === 'mp4' &&
        (fm?.audioBitrate ?? 0) >= 128
      );
    });
    if (!format) {
      return Promise.reject(new Exception('Format not found.'));
    }
    this.logger.info('Format:');
    this.logger.info(
      `    Audio: ${format.mimeType?.split(';')[0]} ${
        format.audioBitrate
      }bit (${format.audioCodec}) Size=${this.sizeDisplay(
        +format?.contentLength
      )}`
    );

    this.progress.create({
      id: '♬ Download     ♯',
      name: info.videoDetails.title,
      percent: 0,
      info: '',
    });
    if (this.convert) {
      this.progress.create({
        id: '↬ Convert      ♯',
        name: info.videoDetails.title,
        percent: 0,
        info: '',
      });
    }

    return await YoutubeUtil.downloadAudio(
      {
        videoInfo: info,
        audioFormat: format,
      },
      {
        useConvert: this.convert,
        onAudioDownloadProgress: progress => {
          this.progress.update({
            id: '♬ Download     ♯',
            name: info.videoDetails.title,
            percent: Number(progress.percentage.toFixed(2)),
            info: `${this.sizeDisplay(progress.transferred)}/${this.sizeDisplay(
              progress.length
            )} | Speed: ${this.sizeDisplay(
              progress.speed
            )}/s | ETA: ${this.timeDisplay(progress.eta)}`,
          });
        },
        onConvertProgress: progress => {
          this.progress.update({
            id: '↬ Convert      ♯',
            name: info.videoDetails.title,
            percent: Number(progress.percent.toFixed(2)),
            info: `${this.timeDisplay(progress.current)}/${this.timeDisplay(
              progress.total
            )}`,
          });
        },
      }
    );
  }

  private async downloadVideo(info: ytdl.videoInfo): Promise<string> {
    const audioFormat = info.formats.find(fm => {
      return (
        fm.hasAudio &&
        !fm.hasVideo &&
        fm.container === 'mp4' &&
        (fm?.audioBitrate ?? 0) >= 128
      );
    });
    if (!audioFormat) {
      return Promise.reject(new Exception('Format not found.'));
    }

    const videoFormat = info.formats.find(fm => {
      return (
        fm.hasVideo &&
        fm.container === 'mp4' &&
        ['1080p', '720p', 'hd1080', 'hd720'].includes(fm.quality.toString())
      );
    });
    if (!videoFormat) {
      return Promise.reject(new Exception('Format not found.'));
    }

    this.logger.info('Format:');
    this.logger.info(
      `    Audio: ${audioFormat.mimeType?.split(';')[0]} ${
        audioFormat.audioBitrate
      }bit (${audioFormat.audioCodec}) Size=${this.sizeDisplay(
        +audioFormat?.contentLength
      )}`
    );
    this.logger.info(
      `    Video: ${videoFormat.mimeType?.split(';')[0]} ${
        videoFormat.quality
      } (${videoFormat.videoCodec}) Size=${this.sizeDisplay(
        +videoFormat?.contentLength
      )}`
    );

    this.progress.create({
      id: '▶ Download     ♯',
      name: info.videoDetails.title,
      percent: 0,
      info: '',
    });
    if (this.convert) {
      this.progress.create({
        id: '♬ Download     ♯',
        name: info.videoDetails.title,
        percent: 0,
        info: '',
      });
      this.progress.create({
        id: '↬ Convert      ♯',
        name: info.videoDetails.title,
        percent: 0,
        info: '',
      });
    }

    return await YoutubeUtil.downloadVideo(
      {
        videoInfo: info,
        audioFormat: audioFormat,
        videoFormat: videoFormat,
      },
      {
        useConvert: this.convert,
        onVideoDownloadProgress: progress => {
          this.progress.update({
            id: '▶ Download     ♯',
            name: info.videoDetails.title,
            percent: Number(progress.percentage.toFixed(2)),
            info: `${this.sizeDisplay(progress.transferred)}/${this.sizeDisplay(
              progress.length
            )} | Speed: ${this.sizeDisplay(
              progress.speed
            )}/s | ETA: ${this.timeDisplay(progress.eta)}`,
          });
        },
        onAudioDownloadProgress: progress => {
          this.progress.update({
            id: '♬ Download     ♯',
            name: info.videoDetails.title,
            percent: Number(progress.percentage.toFixed(2)),
            info: `${this.sizeDisplay(progress.transferred)}/${this.sizeDisplay(
              progress.length
            )} | Speed: ${this.sizeDisplay(
              progress.speed
            )}/s | ETA: ${this.timeDisplay(progress.eta)}`,
          });
        },
        onConvertProgress: progress => {
          this.progress.update({
            id: '↬ Convert      ♯',
            name: info.videoDetails.title,
            percent: Number(progress.percent.toFixed(2)),
            info: `${this.timeDisplay(progress.current)}/${this.timeDisplay(
              progress.total
            )}`,
          });
        },
      }
    );
  }

  private async check(info: ytdl.videoInfo): Promise<void> {
    const formats = info.formats.filter(fm => {
      if (fm.container !== 'mp4') {
        return false;
      }
      if (this.format === 'video') {
        return fm.hasVideo;
      } else {
        return fm.hasAudio && !fm.hasVideo;
      }
    });

    this.logger.info('Format:');
    formats.forEach(fm => {
      this.logger.info(
        `    Tag=${fm.itag} Type=${fm.mimeType?.split(';')[0]} Video=${
          fm.hasVideo ? `${fm.quality} (${fm.videoCodec})` : 'None'
        } Audio=${
          fm.hasAudio ? `${fm.audioBitrate}bit (${fm.audioCodec})` : 'NONE'
        } Size=${this.sizeDisplay(+fm?.contentLength)}`
      );
    });
    return Promise.resolve();
  }

  private async download(info: ytdl.videoInfo): Promise<void> {
    if (this.format === 'audio') {
      await this.downloadAudio(info);
    } else if (this.format === 'video') {
      await this.downloadVideo(info);
    }
    return Promise.resolve();
  }

  protected override async execute(): Promise<void> {
    try {
      if (!this.isValid) {
        throw this.urlException;
      }

      const info = await ytdl.getInfo(this.url);
      this.logger.info(`Id: [${info.videoDetails.videoId}]`);
      this.logger.info(`Url: [${info.videoDetails.video_url}]`);
      this.logger.info(`Title: [${info.videoDetails.title}]`);
      this.logger.info(
        `Length: [${this.timeDisplay(+info.videoDetails.lengthSeconds)}]`
      );
      if (this.action === 'check') {
        await this.check(info);
      }
      if (this.action === 'download') {
        await this.download(info);
      }
    } catch (e: Exception | Error | any) {
      if (e instanceof Exception) {
        this.logger.error(e.message);
      } else {
        this.logger.error('', e);
      }
    }
    return Promise.resolve();
  }
}

const cmdYoutubeDownload = program
  .createCommand('download')
  .description('Download')
  .requiredOption('-u, --url <url>', 'Youtube URL')
  .option('-f, --format <format>', 'Format: audio OR video', 'video')
  .option('-c, --convert', 'Use convert file')
  .action(async options => {
    const obj = new YoutubeDownload(
      'download',
      options.url,
      options.format,
      options.convert
    );
    await obj.run();
  });

const cmdYoutubeCheck = program
  .createCommand('check')
  .description('Check')
  .requiredOption('-u, --url <url>', 'Youtube URL')
  .option('-f, --format <format>', 'Format: audio OR video', 'video')
  .action(async options => {
    const obj = new YoutubeDownload('check', options.url, options.format);
    await obj.run();
  });

const cmdYoutube = program
  .createCommand('youtube')
  .description('Youtube Tools');

cmdYoutube.addCommand(cmdYoutubeCheck);
cmdYoutube.addCommand(cmdYoutubeDownload);

export default cmdYoutube;
