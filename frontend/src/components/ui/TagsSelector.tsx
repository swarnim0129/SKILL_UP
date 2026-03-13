"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Tag = {
    id: string;
    label: string;
};

type TagsSelectorProps = {
    tags?: Tag[]; // Optional predefined tags
    value?: string[]; // Controlled value (array of strings)
    onChange?: (tags: string[]) => void;
    placeholder?: string;
    allowCustom?: boolean;
};

export function TagsSelector({ tags = [], value = [], onChange, placeholder = "Add tag...", allowCustom = true }: TagsSelectorProps) { // Modified to accept allowCustom=true by default
    // Map strings to Tag objects for internal state
    const [selectedTags, setSelectedTags] = useState<Tag[]>(
        value.map(v => ({ id: v, label: v }))
    );

    const [inputValue, setInputValue] = useState("");
    const selectedsContainerRef = useRef<HTMLDivElement>(null);

    // Sync with prop changes
    useEffect(() => {
        setSelectedTags(value.map(v => ({ id: v, label: v })));
    }, [value]);

    const triggerChange = (newTags: Tag[]) => {
        onChange?.(newTags.map(t => t.label));
    };

    const removeSelectedTag = (id: string) => {
        const newTags = selectedTags.filter((tag) => tag.id !== id);
        setSelectedTags(newTags);
        triggerChange(newTags);
    };

    const addSelectedTag = (tag: Tag) => {
        if (selectedTags.some(t => t.id === tag.id)) return;
        const newTags = [...selectedTags, tag];
        setSelectedTags(newTags);
        triggerChange(newTags);
        setInputValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            const newTagStr = inputValue.trim();
            const newTag = { id: newTagStr, label: newTagStr };
            addSelectedTag(newTag);
        }
    };

    useEffect(() => {
        if (selectedsContainerRef.current) {
            selectedsContainerRef.current.scrollTo({
                left: selectedsContainerRef.current.scrollWidth,
                behavior: "smooth",
            });
        }
    }, [selectedTags]);

    const suggestedTags = tags.filter(
        (tag) => !selectedTags.some((selected) => selected.id === tag.id)
    );

    return (
        <div className="max-w-full w-full flex flex-col gap-2">
            {/* Input Area for Custom Tags */}
            <div className="flex gap-2">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
                />
                <Button
                    type="button"
                    onClick={() => inputValue.trim() && addSelectedTag({ id: inputValue.trim(), label: inputValue.trim() })}
                    variant="secondary"
                    className="shrink-0"
                >
                    <Plus size={18} />
                </Button>
            </div>

            {/* Selected Tags Horizontal Scroll */}
            {selectedTags.length > 0 && (
                <motion.div
                    className="w-full flex items-center justify-start gap-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 h-14 overflow-x-auto p-1.5 no-scrollbar rounded-2xl"
                    ref={selectedsContainerRef}
                    layout
                >
                    {selectedTags.map((tag) => (
                        <motion.div
                            key={tag.id}
                            className="flex items-center gap-1 pl-3 pr-1 py-1 bg-white dark:bg-black shadow-sm border border-neutral-200 dark:border-neutral-800 h-full shrink-0 rounded-xl"
                            layoutId={`tag-${tag.id}`}
                        >
                            <motion.span
                                layoutId={`tag-${tag.id}-label`}
                                className="text-neutral-700 dark:text-neutral-200 font-medium text-sm whitespace-nowrap"
                            >
                                {tag.label}
                            </motion.span>
                            <button
                                onClick={() => removeSelectedTag(tag.id)}
                                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            >
                                <X className="size-4 text-neutral-500" />
                            </button>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Suggested Tags Cloud */}
            {suggestedTags.length > 0 && (
                <motion.div
                    className="bg-neutral-50 dark:bg-neutral-900 shadow-sm p-3 border border-neutral-200 dark:border-neutral-800 w-full rounded-2xl"
                    layout
                >
                    <p className="text-xs font-semibold text-neutral-500 mb-2 px-1">Suggested:</p>
                    <motion.div className="flex flex-wrap gap-2">
                        {suggestedTags.map((tag) => (
                            <motion.button
                                type="button"
                                key={tag.id}
                                layoutId={`tag-${tag.id}`}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-full shrink-0 hover:border-blue-500 transition-colors"
                                onClick={() => addSelectedTag(tag)}
                            >
                                <motion.span
                                    layoutId={`tag-${tag.id}-label`}
                                    className="text-neutral-600 dark:text-neutral-300 font-medium text-sm"
                                >
                                    {tag.label}
                                </motion.span>
                                <Plus className="size-3 text-neutral-400" />
                            </motion.button>
                        ))}
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}
