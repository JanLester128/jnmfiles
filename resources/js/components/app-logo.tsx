export default function AppLogo() {
    return (
        <div className="flex items-center gap-2.5">
            <img
                src="/logo.png"
                alt="A VERDADE DE TIERRA"
                className="size-9 shrink-0 rounded-lg object-contain bg-white p-0.5 shadow-xs ring-1 ring-border"
            />
            <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-xs font-extrabold uppercase tracking-tight text-foreground">
                    A VERDADE DE TIERRA
                </span>
                <span className="truncate text-[11px] font-medium text-muted-foreground">
                    jnm land surveying services
                </span>
            </div>
        </div>
    );
}
