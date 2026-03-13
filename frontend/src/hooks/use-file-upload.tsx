import { useCallback, useEffect, useRef, useState } from "react";

interface UseFileUploadProps {
    onUpload?: (file: File) => void;
    accept?: string;
}

export function useFileUpload({ onUpload, accept = "application/pdf" }: UseFileUploadProps = {}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleThumbnailClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFile = event.target.files?.[0];
            if (selectedFile) {
                setFileName(selectedFile.name);
                setFile(selectedFile);
                onUpload?.(selectedFile);
            }
        },
        [onUpload],
    );

    const handleRemove = useCallback(() => {
        setFile(null);
        setFileName(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    return {
        file,
        fileName,
        fileInputRef,
        handleThumbnailClick,
        handleFileChange,
        handleRemove,
    };
}
