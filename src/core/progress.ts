import * as cliProgress from 'cli-progress';

export interface ProgressPayload {
  id: string;
  name: string;
  percent: number;
  info: string;
}

export class CliProgress {
  protected readonly container: cliProgress.MultiBar;
  protected readonly bars: {
    [id: string]: cliProgress.SingleBar;
  };

  constructor() {
    this.container = new cliProgress.MultiBar(
      {
        format: '{id} [{bar}] {percent}% | {info}',
        stopOnComplete: true,
        hideCursor: true,
        //clearOnComplete: true,
        emptyOnZero: true,
      },
      cliProgress.Presets.rect
    );
    this.bars = {};
  }

  public create(payload: ProgressPayload): void {
    this.bars[payload.id] = this.container.create(
      100,
      payload.percent,
      payload
    );
    this.bars[payload.id].on('stop', () => {
      this.remove(payload.id);
    });
  }

  public update(payload: ProgressPayload): void {
    if (this.bars[payload.id]) {
      this.bars[payload.id].update(payload.percent, payload);
    } else {
      this.create(payload);
    }
  }

  public remove(id: string): void {
    setTimeout(() => {
      delete this.bars[id];
    }, 10);
  }
}
