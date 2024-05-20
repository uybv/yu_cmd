import * as fs from 'fs';
import * as path from 'path';
import {Readable} from 'stream';
import * as ytdl from 'ytdl-core';
import * as ffmpeg from 'fluent-ffmpeg';
import * as progressStream from 'progress-stream';
import sanitize = require('sanitize-filename');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

type CONVERT_PROGESS_LISTENER = (progress: {
  percent: number;
  total: number;
  current: number;
}) => void;

type Youtube2Mp3Options = {
  useConvert: boolean;
  onAudioDownloadProgress?: progressStream.ProgressListener;
  onVideoDownloadProgress?: progressStream.ProgressListener;
  onConvertProgress?: CONVERT_PROGESS_LISTENER;
};

type YoutubeDownloadOptions = {
  videoInfo: ytdl.videoInfo;
  audioFormat?: ytdl.videoFormat;
  videoFormat?: ytdl.videoFormat;
};

export class YoutubeUtil {
  private static async downloadFile(
    fileName: string,
    stream: Readable,
    length: number,
    onDownloadProgress?: progressStream.ProgressListener
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const fileExt = 'mp4';
      const p = path.parse(fileName);
      const downloadedFileName = `${p.name}.${fileExt}`;
      const downloadProgress = progressStream(
        {
          length: length,
          time: 200,
        },
        onDownloadProgress ?? (() => {})
      );
      stream
        .on('end', async () => {
          setTimeout(() => {
            resolve(downloadedFileName);
          }, 250);
        })
        .on('error', e => {
          reject(e);
        })
        .pipe(downloadProgress, {end: true})
        .pipe(fs.createWriteStream(downloadedFileName));
    });
  }

  private static getFileName(info: ytdl.videoInfo): string {
    return `${sanitize(info.videoDetails.title)}.mp4`;
  }

  private static async convertToMp3(
    fileName: string,
    onConvertProgress?: CONVERT_PROGESS_LISTENER
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const fnListener = onConvertProgress ? onConvertProgress : () => {};
      const fileExt = 'mp3';
      const p = path.parse(fileName);
      const convertedFileName = `converted_${p.name}.${fileExt}`;
      const saveFileName = `${p.name}.${fileExt}`;
      let totalTime = 0;
      const cmd = ffmpeg(fileName)
        .noVideo()
        //.toFormat(fileExt)
        //.outputFormat(fileExt)
        .audioBitrate(128)
        //.outputOptions('-vn', '-ab', '128k', '-ar', '44100')
        .toFormat(fileExt)
        .on('end', () => {
          fs.rmSync(fileName);
          fs.renameSync(convertedFileName, saveFileName);
          resolve(fileName);
        })
        .on('error', e => {
          reject(e);
        })
        .on('codecData', data => {
          // HERE YOU GET THE TOTAL TIME
          totalTime = Math.round(
            data.duration
              .split(':')
              .reduce(
                (acc: string, time: string) => 60 * Number(acc) + +Number(time)
              )
          );
        })
        .on('progress', progress => {
          // HERE IS THE CURRENT TIME
          const time = Math.round(
            progress.timemark
              .split(':')
              .reduce(
                (acc: string, time: string) => 60 * Number(acc) + +Number(time)
              )
          );
          // AND HERE IS THE CALCULATION
          progress.percent = (time / totalTime) * 100;
          progress.total = totalTime;
          progress.current = time;
          fnListener(progress);
        });

      cmd.saveToFile(convertedFileName);
    });
  }

  private static async mergeToMp4(
    videoFileName: string,
    audioFileName: string,
    outputFileName: string,
    onConvertProgress?: CONVERT_PROGESS_LISTENER
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const fnListener = onConvertProgress ? onConvertProgress : () => {};
      const fileExt = 'mp4';
      const p = path.parse(outputFileName);
      const mergedFileName = `merged_${p.name}.${fileExt}`;
      const saveFileName = `${p.name}.${fileExt}`;
      let totalTime = 1;
      const cmd = ffmpeg()
        .addInput(videoFileName)
        .addInput(audioFileName)
        .addOptions(['-map 0:v', '-map 1:a', '-c:v copy'])
        .format('mp4')
        .toFormat('mp4')
        .on('error', e => {
          reject(e);
        })
        .on('end', () => {
          fs.rmSync(audioFileName);
          fs.rmSync(videoFileName);
          fs.renameSync(mergedFileName, saveFileName);
          resolve(saveFileName);
        })
        .on('codecData', data => {
          // HERE YOU GET THE TOTAL TIME
          totalTime = Math.round(
            data.duration
              .split(':')
              .reduce(
                (acc: string, time: string) => 60 * Number(acc) + +Number(time)
              )
          );
        })
        .on('progress', progress => {
          // HERE IS THE CURRENT TIME
          const time = Math.round(
            progress.timemark
              .split(':')
              .reduce(
                (acc: string, time: string) => 60 * Number(acc) + +Number(time)
              )
          );
          // AND HERE IS THE CALCULATION
          progress.percent = (time / totalTime) * 100;
          progress.total = totalTime;
          progress.current = time;
          fnListener(progress);
        });

      cmd.saveToFile(mergedFileName);
    });
  }

  public static async downloadAudio(
    download: YoutubeDownloadOptions,
    options?: Youtube2Mp3Options
  ): Promise<string> {
    const fileName = this.getFileName(download.videoInfo);
    const fileLength = download.audioFormat?.contentLength
      ? Number(download.audioFormat.contentLength)
      : 0;
    const stream = ytdl.downloadFromInfo(download.videoInfo, {
      format: download.audioFormat,
      requestOptions: {
        maxRedirects: 5,
      },
    });
    const downloadFileName = await this.downloadFile(
      fileName,
      stream,
      fileLength,
      options?.onAudioDownloadProgress
    );
    if (options?.useConvert) {
      return await this.convertToMp3(
        downloadFileName,
        options?.onConvertProgress
      );
    } else {
      return downloadFileName;
    }
  }

  public static async downloadVideo(
    download: YoutubeDownloadOptions,
    options?: Youtube2Mp3Options
  ): Promise<string> {
    const outputFileName = this.getFileName(download.videoInfo);

    const videoFileSize = download.videoFormat?.contentLength
      ? Number(download.videoFormat.contentLength)
      : 0;
    const streamVideo = ytdl.downloadFromInfo(download.videoInfo, {
      format: download.videoFormat,
      requestOptions: {
        maxRedirects: 5,
      },
    });
    const videoFileName = await this.downloadFile(
      `video_${outputFileName}`,
      streamVideo,
      videoFileSize,
      options?.onVideoDownloadProgress
    );

    if (options?.useConvert) {
      const audioFileSize = download.audioFormat?.contentLength
        ? Number(download.audioFormat.contentLength)
        : 0;
      const streamAudio = ytdl.downloadFromInfo(download.videoInfo, {
        format: download.audioFormat,
        requestOptions: {
          maxRedirects: 5,
        },
      });
      const audioFileName = await this.downloadFile(
        `audio_${outputFileName}`,
        streamAudio,
        audioFileSize,
        options?.onAudioDownloadProgress
      );

      return await this.mergeToMp4(
        videoFileName,
        audioFileName,
        outputFileName,
        options?.onConvertProgress
      );
    } else {
      fs.renameSync(videoFileName, outputFileName);
      return Promise.resolve(outputFileName);
    }
  }
}
