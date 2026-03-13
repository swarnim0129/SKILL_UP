"use client";

import { useEffect } from "react";

export default function ScrollbarHider() {
    useEffect(() => {
        document.body.classList.add("no-scrollbar");
        return () => {
            document.body.classList.remove("no-scrollbar");
        };
    }, []);

    return null;
}
