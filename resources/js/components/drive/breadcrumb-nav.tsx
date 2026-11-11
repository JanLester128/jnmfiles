import { Link } from '@inertiajs/react';
import { ArrowLeft, ChevronRight, Folder, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FolderItem, ProjectItem } from '@/types/file-management';

interface BreadcrumbNavProps {
    currentFolder: FolderItem | null;
    currentProject: ProjectItem | null;
    breadcrumbs: Array<{ id: number; name: string; project_id?: number | null }>;
}

export default function BreadcrumbNav({
    currentFolder,
    currentProject,
    breadcrumbs,
}: BreadcrumbNavProps) {
    if (!currentFolder && !currentProject && breadcrumbs.length === 0) {
        return null;
    }

    // Determine parent URL for the Back button
    let backHref = '/drive';
    if (breadcrumbs.length > 1) {
        const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
        backHref = `/drive?folder_id=${parentCrumb.id}${parentCrumb.project_id ? `&project_id=${parentCrumb.project_id}` : ''}`;
    } else if (currentFolder?.parent_id) {
        backHref = `/drive?folder_id=${currentFolder.parent_id}${currentFolder.project_id ? `&project_id=${currentFolder.project_id}` : ''}`;
    } else if (breadcrumbs.length === 1 && currentProject) {
        backHref = `/drive?project_id=${currentProject.id}`;
    }

    return (
        <nav className="flex items-center gap-2 text-sm font-medium text-muted-foreground overflow-x-auto py-1 scrollbar-none">
            <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 px-2.5 text-xs font-semibold gap-1.5 shrink-0 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            >
                <Link href={backHref}>
                    <ArrowLeft className="size-3.5" />
                    <span>Back</span>
                </Link>
            </Button>

            <Link
                href="/drive"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:text-foreground hover:bg-accent transition-colors shrink-0 text-xs font-semibold"
            >
                <HardDrive className="size-3.5 text-emerald-600" />
                <span>My Files</span>
            </Link>

            {currentProject && (
                <>
                    <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                    <Link
                        href={`/drive?project_id=${currentProject.id}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-foreground font-semibold hover:bg-accent transition-colors shrink-0"
                    >
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                            {currentProject.code}
                        </span>
                        <span className="truncate max-w-[200px]">{currentProject.name}</span>
                    </Link>
                </>
            )}

            {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                    <div key={crumb.id} className="flex items-center gap-1.5 shrink-0">
                        <ChevronRight className="size-3.5 text-muted-foreground/60 shrink-0" />
                        {isLast ? (
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent text-foreground font-semibold">
                                <Folder className="size-4 text-emerald-600 fill-emerald-600/20" />
                                <span className="truncate max-w-[220px]">{crumb.name}</span>
                            </span>
                        ) : (
                            <Link
                                href={`/drive?folder_id=${crumb.id}${crumb.project_id ? `&project_id=${crumb.project_id}` : ''}`}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:text-foreground hover:bg-accent transition-colors"
                            >
                                <Folder className="size-4 text-emerald-600/80" />
                                <span className="truncate max-w-[180px]">{crumb.name}</span>
                            </Link>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
