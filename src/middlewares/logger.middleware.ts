import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as morgan from 'morgan';
import * as chalk from 'chalk';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger: any;

  constructor() {
    this.setupCustomTokens();
    this.logger = morgan(this.getLogFormat(), {
      skip: this.shouldSkipLogging,
      stream: { write: this.writeLog },
    });
  }

  private setupCustomTokens() {
    morgan.token('error', (_req: Request, res: Response): string => {
      return res.statusCode >= 400
        ? res.locals.errorMessage || 'Error ' + res.statusCode
        : 'no-error';
    });

    morgan.token('ip', (req: Request) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    });
  }

  private getLogFormat(): string {
    if (process.env.NODE_ENV === 'production') {
      return ':method :url :status :response-time ms :ip';
    } else {
      return ':method :url status[:status] :date[iso] - response-time :response-time ms :error :ip';
    }
  }

  private shouldSkipLogging = (req: Request): boolean => {
    const isStaticFile = req.url.match(
      /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/,
    );
    const isHealthCheck = req.url === '/health' || req.url === '/ping';
    const isFavicon = req.method === 'GET' && req.url === '/favicon.ico';
    const isList = req.method === 'GET' && req.url === '/list';

    return !!(isStaticFile || isHealthCheck || isFavicon || isList);
  };

  private writeLog = (message: string): void => {
    const trimmed = message.trim();

    if (process.env.NODE_ENV !== 'production') {
      // Colored console output for development
      if (trimmed.includes('status[2')) {
        console.log(chalk.green(trimmed));
      } else if (trimmed.includes('status[3')) {
        console.log(chalk.yellow(trimmed));
      } else if (trimmed.includes('status[4')) {
        console.log(chalk.red(trimmed));
      } else if (trimmed.includes('status[5')) {
        console.log(chalk.magenta(trimmed));
      } else {
        console.log(trimmed);
      }
    } else {
      console.log(trimmed);
    }
  };

  use(req: Request, res: Response, next: NextFunction) {
    this.logger(req, res, next);
  }
}
