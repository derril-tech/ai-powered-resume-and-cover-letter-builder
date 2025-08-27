import { Injectable } from '@nestjs/common';

@Injectable()
export class ExportsService {
    async requestExport(dto: {
        exportId: string;
        format: 'docx' | 'pdf' | 'md';
        filename: string;
        content: Record<string, any>;
    }) {
        // Stub call to export worker; later integrate via NATS
        const key = `exports/${dto.exportId}/${dto.filename}.${dto.format}`;
        return {
            status: 'queued',
            exportId: dto.exportId,
            s3Key: key,
        };
    }

    async getExport(id: string) {
        // Stub status retrieval
        return { exportId: id, status: 'completed', url: `https://example-s3/${id}` };
    }
}


