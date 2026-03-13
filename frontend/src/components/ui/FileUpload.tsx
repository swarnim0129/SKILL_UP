import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useFileUpload } from "@/hooks/use-file-upload"
import { FileText, X, Upload, Trash2, FileIcon } from "lucide-react"
import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"

interface FileUploadProps {
    onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
    const {
        file,
        fileName,
        fileInputRef,
        handleThumbnailClick,
        handleFileChange,
        handleRemove,
    } = useFileUpload({
        onUpload: (file) => onFileSelect(file),
        accept: "application/pdf"
    })

    const [isDragging, setIsDragging] = useState(false)

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)

            const droppedFile = e.dataTransfer.files?.[0]
            if (droppedFile && droppedFile.type === "application/pdf") {
                const fakeEvent = {
                    target: {
                        files: [droppedFile],
                    },
                } as unknown as React.ChangeEvent<HTMLInputElement>
                handleFileChange(fakeEvent)
            }
        },
        [handleFileChange],
    )

    return (
        <div className="w-full space-y-4">
            <Input
                type="file"
                accept="application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {!file ? (
                <div
                    onClick={handleThumbnailClick}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        "flex h-40 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800",
                        isDragging && "border-blue-500 bg-blue-50 dark:bg-blue-900/10",
                    )}
                >
                    <div className="rounded-full bg-white dark:bg-black p-3 shadow-sm border border-neutral-200 dark:border-neutral-800">
                        <Upload className="h-6 w-6 text-neutral-500" />
                    </div>
                    <div className="text-center px-4">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">Click to upload JD</p>
                        <p className="text-xs text-neutral-500">
                            or drag and drop PDF here
                        </p>
                    </div>
                </div>
            ) : (
                <div className="relative group overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                            <FileText className="h-6 w-6 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                {fileName}
                            </p>
                            <p className="text-xs text-neutral-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • PDF
                            </p>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleRemove}
                            className="shrink-0 text-neutral-400 hover:text-red-500"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
