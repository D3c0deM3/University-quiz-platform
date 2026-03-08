import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class PythonServiceManager implements OnModuleInit, OnModuleDestroy {
    private config;
    private readonly logger;
    private process;
    private readonly enabled;
    private readonly pythonServiceDir;
    private readonly pythonBin;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private waitForReady;
}
