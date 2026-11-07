import { Link, usePage } from '@inertiajs/react';
import {
    CheckCheck,
    Download,
    ExternalLink,
    FileText,
    FolderOpen,
    Loader2,
    Megaphone,
    MessageSquare,
    Paperclip,
    Search,
    Send,
    ShieldCheck,
    UserCheck,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

export const CHAT_OPEN_EVENT = 'jnm:open-chat';

export interface ChatOpenDetail {
    contactId?: number;
    channel?: 'broadcast' | 'direct';
}

export function openChatDrawer(detail?: ChatOpenDetail) {
    if (typeof window === 'undefined') {
        return;
    }
    window.dispatchEvent(new CustomEvent<ChatOpenDetail>(CHAT_OPEN_EVENT, { detail }));
}

interface ChatContact {
    id: number;
    name: string;
    email: string;
    role: string;
    department: string | null;
    title: string | null;
    avatar: string | null;
    unread_count: number;
    last_message: {
        id: number;
        body: string;
        sender_id: number;
        created_at: string;
    } | null;
}

interface AttachedFileInfo {
    id: number;
    name: string;
    extension: string;
    size_bytes: number;
    category: string;
    folder_id: number | null;
}

interface AttachedFolderInfo {
    id: number;
    name: string;
    color: string | null;
    project_id: number | null;
}

interface ChatMessage {
    id: number;
    sender_id: number;
    recipient_id: number | null;
    is_broadcast: boolean;
    body: string | null;
    read_at: string | null;
    created_at: string;
    sender: {
        id: number;
        name: string;
        email: string;
        role: string;
        title: string | null;
        avatar: string | null;
    } | null;
    attached_file: AttachedFileInfo | null;
    attached_folder: AttachedFolderInfo | null;
}

interface BroadcastSummary {
    unread_count: number;
    last_message: {
        id: number;
        body: string;
        sender_name: string;
        created_at: string;
    } | null;
}

function getXsrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatRelativeTime(iso?: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ChatboxDrawer() {
    const pageProps = usePage().props as any;
    const currentUser = pageProps.auth?.user;
    const isAdmin = Boolean(pageProps.auth?.isAdmin || currentUser?.role === 'admin');
    const initialUnread = Number(pageProps.auth?.unreadMessagesCount ?? 0);
    const initialContacts = (pageProps.auth?.chatContacts ?? []) as ChatContact[];

    const [isOpen, setIsOpen] = useState(false);
    const [contacts, setContacts] = useState<ChatContact[]>(initialContacts);
    const [broadcast, setBroadcast] = useState<BroadcastSummary>({
        unread_count: 0,
        last_message: null,
    });
    const [totalUnread, setTotalUnread] = useState<number>(initialUnread);

    const [activeMode, setActiveMode] = useState<'direct' | 'broadcast'>('direct');
    const [selectedContactId, setSelectedContactId] = useState<number | null>(
        initialContacts.length > 0 ? initialContacts[0].id : null,
    );
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    const [contactSearch, setContactSearch] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Drive attachment picker state
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [driveQuery, setDriveQuery] = useState('');
    const [driveFiles, setDriveFiles] = useState<AttachedFileInfo[]>([]);
    const [driveFolders, setDriveFolders] = useState<AttachedFolderInfo[]>([]);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<AttachedFileInfo | null>(null);
    const [selectedFolder, setSelectedFolder] = useState<AttachedFolderInfo | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setTotalUnread(initialUnread);
    }, [initialUnread]);

    useEffect(() => {
        if (initialContacts.length > 0 && contacts.length === 0) {
            setContacts(initialContacts);
            if (!selectedContactId) {
                setSelectedContactId(initialContacts[0].id);
            }
        }
    }, [initialContacts, contacts.length, selectedContactId]);

    const scrollToBottom = useCallback(() => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    }, []);

    const fetchChatState = useCallback(
        async (opts?: { contactId?: number | null; mode?: 'direct' | 'broadcast'; silent?: boolean }) => {
            if (!currentUser) return;

            const modeToUse = opts?.mode ?? activeMode;
            const contactToUse = opts?.contactId !== undefined ? opts.contactId : selectedContactId;

            if (!opts?.silent) {
                setIsLoadingMessages(true);
            }

            try {
                const params = new URLSearchParams();
                if (isOpen) {
                    if (modeToUse === 'broadcast') {
                        params.set('channel', 'broadcast');
                    } else if (contactToUse) {
                        params.set('contact_id', String(contactToUse));
                    }
                }

                const res = await fetch(`/messages?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });

                if (!res.ok) return;
                const data = await res.json();

                const fetchedContacts: ChatContact[] = data.contacts ?? [];
                setContacts(fetchedContacts);
                setBroadcast(data.broadcast ?? { unread_count: 0, last_message: null });
                setTotalUnread(Number(data.total_unread ?? 0));

                if (isOpen) {
                    // Auto-select first contact if none is selected yet in direct mode
                    if (modeToUse === 'direct' && !contactToUse && fetchedContacts.length > 0) {
                        const defaultContact = fetchedContacts[0];
                        setSelectedContactId(defaultContact.id);
                        // Fetch messages for the auto-selected contact
                        const subRes = await fetch(`/messages?contact_id=${defaultContact.id}`, {
                            headers: { Accept: 'application/json' },
                            credentials: 'same-origin',
                        });
                        if (subRes.ok) {
                            const subData = await subRes.json();
                            setContacts(subData.contacts ?? fetchedContacts);
                            setTotalUnread(Number(subData.total_unread ?? 0));
                            setMessages(subData.messages ?? []);
                        }
                    } else {
                        setMessages(data.messages ?? []);
                    }
                }
            } catch {
                // Ignore transient network errors during background poll
            } finally {
                if (!opts?.silent) {
                    setIsLoadingMessages(false);
                }
            }
        },
        [currentUser, activeMode, selectedContactId, isOpen],
    );

    // Listen for custom open events (e.g. from header or employee directory)
    useEffect(() => {
        const handleOpen = (event: Event) => {
            const detail = (event as CustomEvent<ChatOpenDetail>).detail;
            setIsOpen(true);
            if (detail?.channel === 'broadcast') {
                setActiveMode('broadcast');
            } else if (detail?.contactId) {
                setActiveMode('direct');
                setSelectedContactId(detail.contactId);
            }
        };

        window.addEventListener(CHAT_OPEN_EVENT, handleOpen);
        return () => window.removeEventListener(CHAT_OPEN_EVENT, handleOpen);
    }, []);

    // Fetch when drawer opens or active conversation changes
    useEffect(() => {
        if (isOpen) {
            fetchChatState({ contactId: selectedContactId, mode: activeMode });
        }
    }, [isOpen, activeMode, selectedContactId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        if (isOpen && messages.length > 0) {
            scrollToBottom();
        }
    }, [isOpen, messages.length, activeMode, selectedContactId, scrollToBottom]);

    // Poll for new messages & unread counts
    useEffect(() => {
        if (!currentUser) return;

        const intervalMs = isOpen ? 5000 : 15000;
        const timer = setInterval(() => {
            fetchChatState({
                contactId: selectedContactId,
                mode: activeMode,
                silent: true,
            });
        }, intervalMs);

        return () => clearInterval(timer);
    }, [currentUser, isOpen, selectedContactId, activeMode, fetchChatState]);

    // Fetch Drive files/folders when attachment picker opens or query changes
    useEffect(() => {
        if (!isPickerOpen) return;

        const timer = setTimeout(async () => {
            setIsLoadingDrive(true);
            try {
                const params = new URLSearchParams();
                if (driveQuery.trim()) {
                    params.set('q', driveQuery.trim());
                }
                const res = await fetch(`/messages/drive-items?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });
                if (res.ok) {
                    const data = await res.json();
                    setDriveFiles(data.files ?? []);
                    setDriveFolders(data.folders ?? []);
                }
            } catch {
                toast.error('Unable to load Drive items');
            } finally {
                setIsLoadingDrive(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [isPickerOpen, driveQuery]);

    if (!currentUser) {
        return null;
    }

    const activeContact = contacts.find((c) => c.id === selectedContactId) ?? null;

    const filteredContacts = contacts.filter((c) => {
        if (!contactSearch.trim()) return true;
        const q = contactSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.role.toLowerCase().includes(q) ||
            (c.department || '').toLowerCase().includes(q)
        );
    });

    const canSendInCurrentChannel =
        activeMode === 'broadcast' ? isAdmin : Boolean(selectedContactId);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSendInCurrentChannel || isSending) return;

        const trimmed = messageBody.trim();
        if (!trimmed && !selectedFile && !selectedFolder) {
            toast.error('Please write a message or attach a file/folder from Drive.');
            return;
        }

        setIsSending(true);
        try {
            const res = await fetch('/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    is_broadcast: activeMode === 'broadcast',
                    recipient_id: activeMode === 'direct' ? selectedContactId : null,
                    body: trimmed || null,
                    attached_file_id: selectedFile?.id ?? null,
                    attached_folder_id: selectedFolder?.id ?? null,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.message || 'Failed to send message.');
                return;
            }

            if (data.message) {
                setMessages((prev) => [...prev, data.message]);
            }

            setMessageBody('');
            setSelectedFile(null);
            setSelectedFolder(null);
            setIsPickerOpen(false);
            scrollToBottom();
            fetchChatState({
                contactId: selectedContactId,
                mode: activeMode,
                silent: true,
            });
        } catch {
            toast.error('Network error while sending message.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            {/* Floating Bottom-Right Chat Trigger Button */}
            <div className="fixed right-5 bottom-5 z-45 print:hidden">
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="group relative flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-emerald-950/25 transition-all duration-200 hover:scale-105 hover:from-emerald-500 hover:to-teal-500 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none"
                    aria-label="Open Staff & Admin Chat"
                >
                    <span className="relative flex items-center justify-center">
                        <MessageSquare className="size-5 transition-transform group-hover:-rotate-6" />
                        {totalUnread > 0 && (
                            <span className="absolute -top-2 -right-2.5 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                                {totalUnread > 99 ? '99+' : totalUnread}
                            </span>
                        )}
                    </span>
                    <span className="hidden sm:inline">Team Chat</span>
                </button>
            </div>

            {/* Slide-Over Chatbox Drawer */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetContent
                    side="right"
                    className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-2xl md:max-w-3xl"
                >
                    <SheetHeader className="border-b bg-muted/40 px-5 py-3.5">
                        <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-2.5">
                                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    <MessageSquare className="size-5" />
                                </div>
                                <div>
                                    <SheetTitle className="flex items-center gap-2 text-base">
                                        <span>Staff & Admin Messenger</span>
                                        {totalUnread > 0 && (
                                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                                {totalUnread} unread
                                            </Badge>
                                        )}
                                    </SheetTitle>
                                    <SheetDescription className="text-xs">
                                        Direct 1-on-1 messaging, Drive file sharing & official announcements
                                    </SheetDescription>
                                </div>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Split Drawer Body: Left Contacts & Channels / Right Active Conversation */}
                    <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
                        {/* Left Column: Broadcast Channel + Staff/Admin Contacts */}
                        <div className="flex max-h-56 w-full shrink-0 flex-col border-b bg-muted/15 sm:max-h-none sm:w-68 sm:border-r sm:border-b-0">
                            {/* Search Bar */}
                            <div className="border-b p-2.5">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={contactSearch}
                                        onChange={(e) => setContactSearch(e.target.value)}
                                        placeholder="Search staff or admin..."
                                        className="h-8 pl-8 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {/* Official Broadcast / Announcements Channel */}
                                <button
                                    type="button"
                                    onClick={() => setActiveMode('broadcast')}
                                    className={`flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors ${
                                        activeMode === 'broadcast'
                                            ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500/30'
                                            : 'hover:bg-muted/70'
                                    }`}
                                >
                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                        <Megaphone className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="truncate text-xs font-bold">
                                                Announcements
                                            </span>
                                            {broadcast.unread_count > 0 && (
                                                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                                                    {broadcast.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                            {broadcast.last_message
                                                ? broadcast.last_message.body
                                                : 'Official admin broadcasts'}
                                        </p>
                                    </div>
                                </button>

                                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Users className="size-3" />
                                    <span>Direct Messages ({filteredContacts.length})</span>
                                </div>

                                {filteredContacts.length === 0 ? (
                                    <div className="px-2.5 py-4 text-center text-xs text-muted-foreground space-y-2">
                                        <p>
                                            {contacts.length === 0
                                                ? 'No other user accounts exist in this database yet.'
                                                : 'No matching team members found.'}
                                        </p>
                                        {contacts.length === 0 && isAdmin && (
                                            <Link
                                                href="/team"
                                                onClick={() => setIsOpen(false)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
                                            >
                                                <Users className="size-3" />
                                                <span>Add Employee Accounts</span>
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    filteredContacts.map((contact) => {
                                        const isSelected =
                                            activeMode === 'direct' && selectedContactId === contact.id;
                                        const isContactAdmin = contact.role === 'admin';

                                        return (
                                            <button
                                                key={contact.id}
                                                type="button"
                                                onClick={() => {
                                                    setActiveMode('direct');
                                                    setSelectedContactId(contact.id);
                                                }}
                                                className={`flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-colors ${
                                                    isSelected
                                                        ? 'bg-emerald-500/15 text-foreground ring-1 ring-emerald-500/30'
                                                        : 'hover:bg-muted/70'
                                                }`}
                                            >
                                                <div
                                                    className={`relative flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                        isContactAdmin
                                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                            : 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                                                    }`}
                                                >
                                                    {contact.name.charAt(0).toUpperCase()}
                                                    <span
                                                        className={`absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full ring-2 ring-background ${
                                                            isContactAdmin
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-sky-600 text-white'
                                                        }`}
                                                        title={isContactAdmin ? 'Administrator' : 'Staff'}
                                                    >
                                                        {isContactAdmin ? (
                                                            <ShieldCheck className="size-2.5" />
                                                        ) : (
                                                            <UserCheck className="size-2.5" />
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="truncate text-xs font-semibold">
                                                            {contact.name}
                                                        </span>
                                                        {contact.unread_count > 0 && (
                                                            <span className="flex min-w-4 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                                                                {contact.unread_count}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <span
                                                            className={
                                                                isContactAdmin
                                                                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                                                    : 'text-sky-600 dark:text-sky-400'
                                                            }
                                                        >
                                                            {isContactAdmin ? 'Admin' : 'Staff'}
                                                        </span>
                                                        {contact.title && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="truncate">{contact.title}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {contact.last_message && (
                                                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                            {contact.last_message.sender_id === currentUser.id
                                                                ? 'You: '
                                                                : ''}
                                                            {contact.last_message.body}
                                                        </p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Right Column: Active Conversation Thread */}
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
                            {/* Thread Header */}
                            <div className="flex items-center justify-between border-b px-4 py-2.5">
                                {activeMode === 'broadcast' ? (
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                            <Megaphone className="size-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold">
                                                    All-Staff Broadcast Channel
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                                                >
                                                    Official Notices
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {isAdmin
                                                    ? 'Post announcements and shared files visible to every employee'
                                                    : 'Important updates and shared files from Administrators'}
                                            </p>
                                        </div>
                                    </div>
                                ) : activeContact ? (
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                                                activeContact.role === 'admin'
                                                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                                            }`}
                                        >
                                            {activeContact.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold">{activeContact.name}</h3>
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                        activeContact.role === 'admin'
                                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                            : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                                    }`}
                                                >
                                                    {activeContact.role === 'admin' ? 'Administrator' : 'Employee'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {activeContact.email}
                                                {activeContact.department ? ` • ${activeContact.department}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground">
                                        Select a team member to start chatting
                                    </div>
                                )}
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {isLoadingMessages && messages.length === 0 ? (
                                    <div className="flex h-48 items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <Loader2 className="size-4 animate-spin" />
                                        <span>Loading conversation...</span>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex h-56 flex-col items-center justify-center text-center px-4">
                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2.5">
                                            {activeMode === 'broadcast' ? (
                                                <Megaphone className="size-6" />
                                            ) : (
                                                <MessageSquare className="size-6" />
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold">
                                            {activeMode === 'broadcast'
                                                ? 'No announcements posted yet'
                                                : activeContact
                                                  ? `Start a conversation with ${activeContact.name}`
                                                  : 'No conversation selected'}
                                        </p>
                                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                            {activeMode === 'broadcast'
                                                ? 'Administrators can broadcast company-wide updates and link survey files or folders here.'
                                                : 'Send a direct message or attach a file/folder directly from your cloud drive.'}
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.sender_id === currentUser.id;
                                        const senderIsAdmin = msg.sender?.role === 'admin';

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex flex-col ${
                                                    isMe ? 'items-end' : 'items-start'
                                                }`}
                                            >
                                                <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                                                    <span className="font-semibold text-foreground/80">
                                                        {isMe ? 'You' : msg.sender?.name || 'Team Member'}
                                                    </span>
                                                    {senderIsAdmin && (
                                                        <span className="rounded bg-emerald-500/15 px-1 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                    <span>•</span>
                                                    <span>{formatRelativeTime(msg.created_at)}</span>
                                                </div>

                                                <div
                                                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                                                        msg.is_broadcast
                                                            ? 'border border-amber-500/30 bg-amber-500/10 text-foreground'
                                                            : isMe
                                                              ? 'bg-emerald-600 text-white'
                                                              : 'border bg-muted/60 text-foreground'
                                                    }`}
                                                >
                                                    {msg.body && (
                                                        <p className="whitespace-pre-wrap leading-relaxed break-words">
                                                            {msg.body}
                                                        </p>
                                                    )}

                                                    {/* Attached Drive File Card */}
                                                    {msg.attached_file && (
                                                        <div
                                                            className={`mt-2 flex items-center justify-between gap-2.5 rounded-xl border p-2 ${
                                                                isMe && !msg.is_broadcast
                                                                    ? 'border-white/20 bg-black/15 text-white'
                                                                    : 'border-border bg-background text-foreground'
                                                            }`}
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <FileText className="size-4 shrink-0 opacity-80" />
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-xs font-semibold">
                                                                        {msg.attached_file.name}
                                                                    </p>
                                                                    <p className="text-[10px] opacity-75">
                                                                        {msg.attached_file.extension.toUpperCase()} •{' '}
                                                                        {formatBytes(msg.attached_file.size_bytes)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex shrink-0 items-center gap-1">
                                                                <a
                                                                    href={`/files/${msg.attached_file.id}/download`}
                                                                    className="rounded-lg p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                                                    title="Download File"
                                                                >
                                                                    <Download className="size-3.5" />
                                                                </a>
                                                                <Link
                                                                    href={
                                                                        msg.attached_file.folder_id
                                                                            ? `/drive?folder_id=${msg.attached_file.folder_id}`
                                                                            : '/drive'
                                                                    }
                                                                    onClick={() => setIsOpen(false)}
                                                                    className="rounded-lg p-1.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                                                    title="Open location in Drive"
                                                                >
                                                                    <ExternalLink className="size-3.5" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Attached Drive Folder Card */}
                                                    {msg.attached_folder && (
                                                        <div
                                                            className={`mt-2 flex items-center justify-between gap-2.5 rounded-xl border p-2 ${
                                                                isMe && !msg.is_broadcast
                                                                    ? 'border-white/20 bg-black/15 text-white'
                                                                    : 'border-border bg-background text-foreground'
                                                            }`}
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <FolderOpen className="size-4 shrink-0 opacity-80" />
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-xs font-semibold">
                                                                        {msg.attached_folder.name}
                                                                    </p>
                                                                    <p className="text-[10px] opacity-75">
                                                                        Drive Folder
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Link
                                                                href={`/drive?folder_id=${msg.attached_folder.id}`}
                                                                onClick={() => setIsOpen(false)}
                                                                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                                            >
                                                                <span>Open</span>
                                                                <ExternalLink className="size-3" />
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>

                                                {isMe && !msg.is_broadcast && (
                                                    <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                                                        <CheckCheck
                                                            className={`size-3 ${
                                                                msg.read_at
                                                                    ? 'text-emerald-500'
                                                                    : 'text-muted-foreground/60'
                                                            }`}
                                                        />
                                                        <span>{msg.read_at ? 'Seen' : 'Sent'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Drive Attachment Picker Popover Panel */}
                            {isPickerOpen && canSendInCurrentChannel && (
                                <div className="border-t bg-muted/30 p-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-xs font-semibold flex items-center gap-1.5">
                                            <Paperclip className="size-3.5 text-emerald-600" />
                                            <span>Attach File or Folder from Drive</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsPickerOpen(false)}
                                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                    <Input
                                        value={driveQuery}
                                        onChange={(e) => setDriveQuery(e.target.value)}
                                        placeholder="Filter files or folders by name..."
                                        className="mb-2 h-8 text-xs"
                                    />
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {isLoadingDrive ? (
                                            <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1.5">
                                                <Loader2 className="size-3.5 animate-spin" />
                                                <span>Searching Drive...</span>
                                            </div>
                                        ) : driveFolders.length === 0 && driveFiles.length === 0 ? (
                                            <p className="py-3 text-center text-xs text-muted-foreground">
                                                No accessible Drive files or folders found.
                                            </p>
                                        ) : (
                                            <>
                                                {driveFolders.map((folder) => (
                                                    <button
                                                        key={`folder-${folder.id}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedFolder(folder);
                                                            setSelectedFile(null);
                                                            setIsPickerOpen(false);
                                                        }}
                                                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                                                    >
                                                        <span className="flex items-center gap-2 truncate">
                                                            <FolderOpen className="size-3.5 shrink-0 text-amber-500" />
                                                            <span className="truncate font-medium">
                                                                {folder.name}
                                                            </span>
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Folder
                                                        </span>
                                                    </button>
                                                ))}
                                                {driveFiles.map((file) => (
                                                    <button
                                                        key={`file-${file.id}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedFile(file);
                                                            setSelectedFolder(null);
                                                            setIsPickerOpen(false);
                                                        }}
                                                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                                                    >
                                                        <span className="flex items-center gap-2 truncate">
                                                            <FileText className="size-3.5 shrink-0 text-sky-500" />
                                                            <span className="truncate font-medium">
                                                                {file.name}
                                                            </span>
                                                        </span>
                                                        <span className="shrink-0 text-[10px] text-muted-foreground">
                                                            {formatBytes(file.size_bytes)}
                                                        </span>
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Selected Attachment Pill Preview */}
                            {(selectedFile || selectedFolder) && (
                                <div className="flex items-center justify-between border-t bg-emerald-500/10 px-4 py-2 text-xs">
                                    <div className="flex items-center gap-2 truncate">
                                        {selectedFile ? (
                                            <>
                                                <FileText className="size-4 shrink-0 text-emerald-600" />
                                                <span className="truncate font-medium">
                                                    Attached file: {selectedFile.name}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <FolderOpen className="size-4 shrink-0 text-amber-600" />
                                                <span className="truncate font-medium">
                                                    Attached folder: {selectedFolder?.name}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedFile(null);
                                            setSelectedFolder(null);
                                        }}
                                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Composer Input Bar */}
                            {canSendInCurrentChannel ? (
                                <form
                                    onSubmit={handleSendMessage}
                                    className="flex items-end gap-2 border-t bg-muted/20 p-3"
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setIsPickerOpen((v) => !v)}
                                        className="size-9 shrink-0"
                                        title="Attach Drive file or folder"
                                    >
                                        <Paperclip className="size-4" />
                                    </Button>

                                    <textarea
                                        value={messageBody}
                                        onChange={(e) => setMessageBody(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        rows={1}
                                        placeholder={
                                            activeMode === 'broadcast'
                                                ? 'Write an announcement to all staff... (Enter to send)'
                                                : `Message ${activeContact?.name ?? ''}... (Enter to send)`
                                        }
                                        className="max-h-28 min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-xs shadow-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                    />

                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={
                                            isSending ||
                                            (!messageBody.trim() && !selectedFile && !selectedFolder)
                                        }
                                        className="size-9 shrink-0 bg-emerald-600 text-white hover:bg-emerald-500"
                                        title="Send Message"
                                    >
                                        {isSending ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Send className="size-4" />
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                <div className="border-t bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
                                    {activeMode === 'broadcast'
                                        ? 'Only administrators can post in the Announcements channel. Select a person on the left to send a direct message.'
                                        : 'Select a team member on the left to send a message.'}
                                </div>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

