import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'VendHub Manager API',
    };
  }

  getInfo() {
    return {
      name: 'VendHub Manager API',
      version: '1.0.0',
      description: 'Vending Machine Management System - Manual Operations Architecture',
      documentation: '/api/docs',
      architecture: {
        type: 'manual-operations',
        machineIntegration: false,
        dataSource: 'operator-actions-and-imports',
      },
    };
  }
}
