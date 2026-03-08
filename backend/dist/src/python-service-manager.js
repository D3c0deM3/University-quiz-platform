"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PythonServiceManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonServiceManager = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const path_1 = require("path");
const fs_1 = require("fs");
let PythonServiceManager = PythonServiceManager_1 = class PythonServiceManager {
    config;
    logger = new common_1.Logger(PythonServiceManager_1.name);
    process = null;
    enabled;
    pythonServiceDir;
    pythonBin;
    constructor(config) {
        this.config = config;
        this.enabled = this.config.get('AUTO_START_PYTHON', 'true') !== 'false';
        const baseDir = this.config.get('PYTHON_SERVICE_DIR', '');
        this.pythonServiceDir = baseDir
            ? (0, path_1.resolve)(baseDir)
            : (0, path_1.resolve)(process.cwd(), '..', 'python-service');
        const venvPython = (0, path_1.join)(this.pythonServiceDir, 'venv', 'bin', 'python');
        this.pythonBin = (0, fs_1.existsSync)(venvPython) ? venvPython : 'python3';
    }
    async onModuleInit() {
        if (!this.enabled) {
            this.logger.log('Python service auto-start is disabled');
            return;
        }
        if (!(0, fs_1.existsSync)(this.pythonServiceDir)) {
            this.logger.warn(`Python service directory not found: ${this.pythonServiceDir}. Skipping auto-start.`);
            return;
        }
        const runScript = (0, path_1.join)(this.pythonServiceDir, 'run.py');
        if (!(0, fs_1.existsSync)(runScript)) {
            this.logger.warn(`run.py not found in ${this.pythonServiceDir}. Skipping.`);
            return;
        }
        this.logger.log(`Starting Python service from ${this.pythonServiceDir} using ${this.pythonBin}`);
        this.process = (0, child_process_1.spawn)(this.pythonBin, ['run.py'], {
            cwd: this.pythonServiceDir,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                HOST: '0.0.0.0',
                PORT: this.config.get('PYTHON_SERVICE_PORT', '8000'),
                NESTJS_BACKEND_URL: `http://localhost:${this.config.get('PORT', '3000')}/api`,
                AI_API_KEY: this.config.get('AI_API_KEY', ''),
                AI_MODEL: this.config.get('AI_MODEL', 'gemini-3.1-flash-lite-preview'),
                DATABASE_URL: this.config.get('DATABASE_URL', ''),
                UPLOAD_DIR: this.config.get('UPLOAD_DIR', '../uploads'),
            },
        });
        this.process.stdout?.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg)
                this.logger.log(`[Python] ${msg}`);
        });
        this.process.stderr?.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) {
                if (msg.includes('ERROR') || msg.includes('Traceback')) {
                    this.logger.error(`[Python] ${msg}`);
                }
                else {
                    this.logger.log(`[Python] ${msg}`);
                }
            }
        });
        this.process.on('close', (code) => {
            if (code !== null && code !== 0) {
                this.logger.error(`Python service exited with code ${code}`);
            }
            else {
                this.logger.log('Python service stopped');
            }
            this.process = null;
        });
        this.process.on('error', (err) => {
            this.logger.error(`Failed to start Python service: ${err.message}`);
            this.process = null;
        });
        await this.waitForReady();
    }
    async onModuleDestroy() {
        if (this.process) {
            this.logger.log('Shutting down Python service...');
            this.process.kill('SIGTERM');
            await new Promise((resolve) => {
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
    async waitForReady(retries = 15, delay = 1000) {
        const url = `http://localhost:${this.config.get('PYTHON_SERVICE_PORT', '8000')}/health/`;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    this.logger.log('✅ Python service is ready');
                    return;
                }
            }
            catch {
            }
            await new Promise((r) => setTimeout(r, delay));
        }
        this.logger.warn('Python service health check timed out — it may still be starting. Continuing...');
    }
};
exports.PythonServiceManager = PythonServiceManager;
exports.PythonServiceManager = PythonServiceManager = PythonServiceManager_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PythonServiceManager);
//# sourceMappingURL=python-service-manager.js.map