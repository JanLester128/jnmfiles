import type { User } from './auth';

export type { User };

export interface Tag {
    id: number;
    name: string;
    color: string;
}

export interface FileVersion {
    id: number;
    file_id?: number;
    version_number: number;
    is_current?: boolean;
    size_bytes: number;
    formatted_size: string;
    checksum?: string;
    changelog?: string;
    creator?: User;
    created_at: string;
}

export interface FileItem {
    id: number;
    folder_id: number | null;
    project_id: number | null;
    name: string;
    original_filename: string;
    file_path: string;
    disk: string;
    mime_type: string;
    extension: string;
    size_bytes: number;
    formatted_size?: string;
    current_version: number;
    category: 'dlsd' | 'xml' | 'cad' | 'gis' | 'raw_survey' | 'lidar' | 'photo' | 'document' | 'spreadsheet' | 'archive' | 'other';
    is_starred: boolean;
    is_trashed: boolean;
    trashed_at: string | null;
    is_locked: boolean;
    locked_by: number | null;
    locked_at: string | null;
    lock_note: string | null;
    description: string | null;
    metadata: Record<string, any> | null;
    tags?: Tag[];
    creator?: User;
    locker?: User;
    project?: { id: number; code: string; name: string };
    folder?: { id: number; name: string };
    versions_count?: number;
    created_at: string;
    updated_at: string;
}

export interface FolderItem {
    id: number;
    project_id: number | null;
    parent_id: number | null;
    name: string;
    description: string | null;
    color: string | null;
    category: string | null;
    is_system: boolean;
    is_locked?: boolean;
    lock_reason?: string | null;
    locked_by?: number | null;
    is_starred: boolean;
    is_trashed: boolean;
    trashed_at: string | null;
    files_count?: number;
    creator?: User;
    locker?: User;
    project?: { id: number; code: string; name: string };
    created_at: string;
    updated_at: string;
}

export interface ProjectItem {
    id: number;
    code: string;
    name: string;
    client_name: string;
    location: string | null;
    survey_type: string;
    status: 'planning' | 'field_work' | 'processing' | 'review' | 'approved' | 'archived';
    description: string | null;
    coordinate_system: string | null;
    datum: string | null;
    benchmark_ref: string | null;
    start_date: string | null;
    target_date: string | null;
    is_confidential: boolean;
    manager_id: number | null;
    created_by: number;
    root_folder_id: number | null;
    manager?: User;
    creator?: User;
    members?: Array<User & { pivot?: { role: string } }>;
    files_count?: number;
    folders_count?: number;
    members_count?: number;
    storage_used_bytes?: number;
    created_at: string;
    updated_at: string;
}

export interface ActivityItem {
    id: number;
    user_id: number | null;
    action: string;
    subject_type: string | null;
    subject_id: number | null;
    subject_name: string;
    project_id: number | null;
    details: Record<string, any> | null;
    ip_address: string | null;
    created_at: string;
    user?: User;
    project?: { id: number; code: string; name: string };
}

