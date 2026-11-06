import { router } from '@inertiajs/react';
import {
    ArrowUpDown,
    FolderPlus,
    LayoutGrid,
    List,
    Search,
    UploadCloud,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

interface ToolbarProps {
    filters: {
        folder_id?: number | string | null;
        project_id?: number | string | null;
        category?: string;
        starred?: boolean;
        trashed?: boolean;
        shared?: boolean;
        q?: string;
        sort?: string;
        direction?: string;
        view?: string;
    };
    onOpenUpload: () => void;
    onOpenNewFolder: () => void;
}

export default function Toolbar({ filters, onOpenUpload, onOpenNewFolder }: ToolbarProps) {
    const [searchQuery, setSearchQuery] = useState(filters.q || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ q: searchQuery });
    };

    const clearSearch = () => {
        setSearchQuery('');
        applyFilters({ q: '' });
    };

    const applyFilters = (newFilters: Record<string, any>) => {
        const merged: Record<string, any> = { ...filters, ...newFilters };
        Object.keys(merged).forEach((k) => {
            if (merged[k] === '' || merged[k] === null || merged[k] === undefined || merged[k] === false || (k === 'category' && merged[k] === 'all')) {
                delete merged[k];
            }
        });
        router.get('/drive', merged, { preserveState: true, replace: true });
    };

    return (
        <div className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {!filters.trashed && (
                        <>
                            <Button
                                type="button"
                                onClick={onOpenNewFolder}
                                variant="outline"
                                className="gap-2 border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                                <FolderPlus className="size-4 text-emerald-600" />
                                <span>New Folder</span>
                            </Button>

                            <Button
                                type="button"
                                onClick={onOpenUpload}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2"
                            >
                                <UploadCloud className="size-4" />
                                <span>Upload Files</span>
                            </Button>
                        </>
                    )}

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="relative flex-1 sm:w-64 md:w-72">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search files or folders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-8 h-9 text-sm rounded-lg bg-background"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </form>
                </div>

                {/* Right Controls: Supported Formats Badge, Sort & Grid/List View */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground mr-1">
                        {['DLSD', 'XML', 'DWG', 'JPG', 'PNG'].map((ext) => (
                            <span
                                key={ext}
                                className="font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border/70"
                            >
                                .{ext}
                            </span>
                        ))}
                    </div>

                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                                <span>
                                    Sort:{' '}
                                    {filters.sort === 'date'
                                        ? 'Modified'
                                        : filters.sort === 'created'
                                          ? 'Created'
                                          : filters.sort === 'size'
                                            ? 'Size'
                                            : filters.sort === 'type'
                                              ? 'Type'
                                              : 'Name'}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs">Sort By</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => applyFilters({ sort: 'name' })}
                                className={!filters.sort || filters.sort === 'name' ? 'font-bold text-emerald-600' : ''}
                            >
                                Name
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => applyFilters({ sort: 'date' })}
                                className={filters.sort === 'date' ? 'font-bold text-emerald-600' : ''}
                            >
                                Date Modified
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => applyFilters({ sort: 'created' })}
                                className={filters.sort === 'created' ? 'font-bold text-emerald-600' : ''}
                            >
                                Date Created
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => applyFilters({ sort: 'size' })}
                                className={filters.sort === 'size' ? 'font-bold text-emerald-600' : ''}
                            >
                                File Size
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => applyFilters({ sort: 'type' })}
                                className={filters.sort === 'type' ? 'font-bold text-emerald-600' : ''}
                            >
                                File Type
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-xs">Order</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => applyFilters({ direction: 'asc' })}
                                className={filters.direction !== 'desc' ? 'font-bold text-emerald-600' : ''}
                            >
                                Ascending
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => applyFilters({ direction: 'desc' })}
                                className={filters.direction === 'desc' ? 'font-bold text-emerald-600' : ''}
                            >
                                Descending
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View Mode Toggle (Grid vs List) */}
                    <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
                        <button
                            type="button"
                            onClick={() => applyFilters({ view: 'grid' })}
                            className={`p-1.5 rounded-md transition-colors ${
                                filters.view !== 'list'
                                    ? 'bg-background shadow-xs text-foreground font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => applyFilters({ view: 'list' })}
                            className={`p-1.5 rounded-md transition-colors ${
                                filters.view === 'list'
                                    ? 'bg-background shadow-xs text-foreground font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="List View"
                        >
                            <List className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
