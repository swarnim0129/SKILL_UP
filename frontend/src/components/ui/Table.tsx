import React from 'react';

interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField: keyof T;
    loading?: boolean;
    emptyMessage?: string;
}

export default function Table<T>({
    columns,
    data,
    keyField,
    loading = false,
    emptyMessage = 'No data available',
}: TableProps<T>) {
    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center text-slate-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                className={`px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 ${column.className || ''}`}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr
                            key={String(item[keyField])}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-800/50"
                        >
                            {columns.map((column) => (
                                <td
                                    key={String(column.key)}
                                    className={`px-4 py-4 text-sm text-slate-700 dark:text-slate-300 ${column.className || ''}`}
                                >
                                    {column.render
                                        ? column.render(item)
                                        : String(item[column.key as keyof T] || '-')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
