export interface ProcessingProgress {
    current_file_name: string;
    processed_files_count: number;
    total_files_count: number;
    processed_bytes: number;
    total_bytes: number;
    tokens_saved: number;
}
