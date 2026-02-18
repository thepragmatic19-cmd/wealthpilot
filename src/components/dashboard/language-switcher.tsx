"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";

const LOCALES = [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
];

function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${value};expires=${expires};path=/`;
}

function getCookieValue(name: string): string {
    if (typeof document === "undefined") return "fr";
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? match[1] : "fr";
}

// Subscribe to cookie changes (no automatic change notification, so noop)
const emptySubscribe = () => () => { };

export function LanguageSwitcher() {
    const router = useRouter();

    const currentLocale = useSyncExternalStore(
        emptySubscribe,
        () => getCookieValue("locale"),
        () => "fr"
    );

    const switchLocale = useCallback((locale: string) => {
        setCookie("locale", locale, 365);
        router.refresh();
    }, [router]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Changer de langue">
                    <Languages className="h-4 w-4" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {LOCALES.map((l) => (
                    <DropdownMenuItem
                        key={l.code}
                        onClick={() => switchLocale(l.code)}
                        className={currentLocale === l.code ? "bg-accent" : ""}
                    >
                        <span className="mr-2">{l.flag}</span>
                        {l.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
