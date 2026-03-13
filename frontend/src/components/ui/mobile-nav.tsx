'use client'

import React from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { ShadcnButton } from '@/components/ui/shadcn-button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

type MobileNavProps = {
    nav: {
        name: string
        items: {
            label: string
            href: string
        }[]
    }[]
}

export function MobileNav({ nav }: MobileNavProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <ShadcnButton
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'extend-touch-target block size-10 touch-manipulation items-center justify-center gap-2.5 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-0 active:bg-white/10 md:hidden rounded-lg'
                    )}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="relative size-5">
                            <span
                                className={cn(
                                    'absolute left-0 block h-[2px] w-5 rounded-full transition-all duration-200 bg-neutral-900 dark:bg-white',
                                    open ? 'top-[0.55rem] -rotate-45' : 'top-1'
                                )}
                            />
                            <span
                                className={cn(
                                    'absolute left-0 block h-[2px] w-5 rounded-full transition-all duration-200 bg-neutral-900 dark:bg-white',
                                    open ? 'top-[0.55rem] rotate-45' : 'top-3'
                                )}
                            />
                        </div>
                        <span className="sr-only">Toggle Menu</span>
                    </div>
                </ShadcnButton>
            </PopoverTrigger>
            <PopoverContent
                className="bg-background/95 no-scrollbar h-(--radix-popover-content-available-height) w-(--radix-popover-content-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur-xl duration-200"
                align="start"
                side="bottom"
                alignOffset={-16}
                sideOffset={4}
            >
                <div className="flex flex-col gap-8 overflow-auto px-6 py-8">
                    {nav.map((category, index) => (
                        <div className="flex flex-col gap-3" key={index}>
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                                {category.name}
                            </p>
                            <div className="flex flex-col gap-1">
                                {category.items.map((item, idx) => (
                                    <Link
                                        key={idx}
                                        href={item.href}
                                        className="text-xl font-medium py-2 px-3 rounded-xl hover:bg-foreground/5 transition-colors"
                                        onClick={() => setOpen(false)}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Auth Section */}
                    <div className="flex flex-col gap-3">
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                            Account
                        </p>
                        <SignedOut>
                            <Link
                                href="/signup"
                                className="text-xl font-medium py-2 px-3 rounded-xl hover:bg-foreground/5 transition-colors"
                                onClick={() => setOpen(false)}
                            >
                                Sign In
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <div className="flex items-center gap-3 py-2 px-3">
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-10 h-10",
                                        },
                                    }}
                                />
                                <span className="text-lg font-medium">My Account</span>
                            </div>
                        </SignedIn>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
