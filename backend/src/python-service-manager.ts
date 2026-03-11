import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChildProcess, spawn } from 'child_process';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

@Injectable()
export class PythonServiceManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PythonServiceManager.name);
  private process: ChildProcess | null = null;
  private readonly enabled: boolean;
  private readonly pythonServiceDir: string;
  private readonly pythonBin: string;

  constructor(private config: ConfigService) {
    // Allow disabling auto-start (e.g. in Docker where Python runs separately)
    this.enabled = this.config.get('AUTO_START_PYTHON', 'true') !== 'false';

    // Resolve the python-service directory relative to backend root
    const baseDir = this.config.get('PYTHON_SERVICE_DIR', '');
    this.pythonServiceDir = baseDir
      ? resolve(baseDir)
      : resolve(process.cwd(), '..', 'python-service');

    // Prefer venv python, fallback to system python3
    const venvPython = join(this.pythonServiceDir, 'venv', 'bin', 'python');
    this.pythonBin = existsSync(venvPython) ? venvPython : 'python3';
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Python service auto-start is disabled');
      return;
    }

    if (!existsSync(this.pythonServiceDir)) {
      this.logger.warn(
        `Python service directory not found: ${this.pythonServiceDir}. Skipping auto-start.`,
      );
      return;
    }

    const runScript = join(this.pythonServiceDir, 'run.py');
    if (!existsSync(runScript)) {
      this.logger.warn(`run.py not found in ${this.pythonServiceDir}. Skipping.`);
      return;
    }

    this.logger.log(
      `Starting Python service from ${this.pythonServiceDir} using ${this.pythonBin}`,
    );

    this.process = spawn(this.pythonBin, ['run.py'], {
      cwd: this.pythonServiceDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Forward relevant env vars to the Python process
        HOST: '0.0.0.0',
        PORT: this.config.get('PYTHON_SERVICE_PORT', '8000'),
        NESTJS_BACKEND_URL: `http://localhost:${this.config.get('PORT', '3000')}/api`,
        AI_API_KEY: this.config.get('AI_API_KEY', ''),
        AI_MODEL: this.config.get('AI_MODEL', 'gemini-3.1-flash-lite-preview'),
        DATABASE_URL: this.config.get('DATABASE_URL', ''),
        UPLOAD_DIR: this.config.get('UPLOAD_DIR', '../uploads'),
        INTERNAL_PROCESSING_KEY: this.config.get('INTERNAL_PROCESSING_KEY', 'local-processing-key'),
        PYTHON_RELOAD: this.config.get('PYTHON_RELOAD', 'false'),
      },
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) this.logger.log(`[Python] ${msg}`);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) {
        // Uvicorn logs to stderr by default — not all stderr is errors
        if (msg.includes('ERROR') || msg.includes('Traceback')) {
          this.logger.error(`[Python] ${msg}`);
        } else {
          this.logger.log(`[Python] ${msg}`);
        }
      }
    });

    this.process.on('close', (code) => {
      if (code !== null && code !== 0) {
        this.logger.error(`Python service exited with code ${code}`);
      } else {
        this.logger.log('Python service stopped');
      }
      this.process = null;
    });

    this.process.on('error', (err) => {
      this.logger.error(`Failed to start Python service: ${err.message}`);
      this.process = null;
    });

    // Wait a moment for Python service to be ready
    await this.waitForReady();
  }

  async onModuleDestroy() {
    if (this.process) {
      this.logger.log('Shutting down Python service...');
      this.process.kill('SIGTERM');

      // Give it 5 seconds to gracefully shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.logger.warn('Force killing Python service');
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.process?.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
    }
  }

  private async waitForReady(retries = 15, delay = 1000): Promise<void> {
    const url = `http://localhost:${this.config.get('PYTHON_SERVICE_PORT', '8000')}/health/`;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          this.logger.log('✅ Python service is ready');
          return;
        }
      } catch {
        // Not ready yet
      }
      await new Promise((r) => setTimeout(r, delay));
    }

    // Even if health check fails, don't crash — the service may have a different health endpoint
    this.logger.warn(
      'Python service health check timed out — it may still be starting. Continuing...',
    );
  }
}
