import React, { useState, useRef } from 'react';
import { ImageAsset } from '../types';
import { Upload, X, Copy, Trash2, Edit2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { copyToClipboard } from '../../../../utils/clipboard';

interface AssetManagerProps {
    assets: ImageAsset[];
    onAssetsChange: (assets: ImageAsset[]) => void;
    onSelectAsset?: (url: string) => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ assets, onAssetsChange, onSelectAsset }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFiles = (files: FileList) => {
        const newAssets: ImageAsset[] = [];
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            // For a real app, you would upload to R2/S3 here.
            // For this implementation, we will create a temporary ObjectURL for local preview
            // OR ideally convert to base64 if small enough to store in config (not recommended for many).
            // We'll simulate upload and store a placeholder or Object URL.

            const tempUrl = URL.createObjectURL(file);
            newAssets.push({
                id: crypto.randomUUID(),
                name: file.name,
                url: tempUrl,
                size: file.size,
                type: file.type,
                createdAt: Date.now()
            });
        });

        if (newAssets.length > 0) {
            onAssetsChange([...newAssets, ...assets]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (confirm('¿Eliminar esta imagen de la librería?')) {
            onAssetsChange(assets.filter(a => a.id !== id));
        }
    };

    const handleCopyUrl = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        void copyToClipboard(url);
        // Toast indicator would be nice here
    };

    const startEditing = (asset: ImageAsset, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingAssetId(asset.id);
        setEditName(asset.name);
    };

    const saveEdit = (id: string, e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        onAssetsChange(assets.map(a => a.id === id ? { ...a, name: editName } : a));
        setEditingAssetId(null);
    };

    // Format bytes nicely
    const formatBytes = (bytes = 0) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Upload Area */}
            <div
                className={`p-8 border-2 border-dashed rounded-3xl transition-all m-6 flex flex-col items-center justify-center text-center cursor-pointer ${isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
                    <Upload size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">Subir Imágenes</h3>
                <p className="text-sm text-slate-500 max-w-xs font-medium">
                    Arrastra imágenes aquí o haz clic para explorar. Admite JPG, PNG, WEBP.
                </p>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ImageIcon size={18} className="text-indigo-500" />
                        Librería ({assets.length})
                    </h3>
                </div>

                {assets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 mt-10">
                        No hay imágenes subidas a este proyecto.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {assets.map(asset => (
                            <div
                                key={asset.id}
                                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative"
                                onClick={() => onSelectAsset && onSelectAsset(asset.url)}
                            >
                                <div className="aspect-[4/3] relative bg-slate-100">
                                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />

                                    {/* Action Overlay */}
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                        <button
                                            onClick={(e) => handleCopyUrl(asset.url, e)}
                                            className="p-2 bg-white/20 hover:bg-white text-white hover:text-indigo-600 rounded-lg backdrop-blur"
                                            title="Copiar URL"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(asset.id, e)}
                                            className="p-2 bg-white/20 hover:bg-red-500 text-white rounded-lg backdrop-blur"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 border-t border-slate-100">
                                    {editingAssetId === asset.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={() => saveEdit(asset.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(asset.id, e)}
                                            className="w-full text-xs font-bold text-slate-800 border-b border-indigo-500 outline-none mb-1"
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <h4
                                                className="text-xs font-bold text-slate-800 truncate"
                                                title={asset.name}
                                            >
                                                {asset.name}
                                            </h4>
                                            <button
                                                onClick={(e) => startEditing(asset, e)}
                                                className="text-slate-400 hover:text-indigo-500 flex-shrink-0"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                                        {formatBytes(asset.size)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Warning logic for mock objects */}
            <div className="px-6 py-4 bg-amber-50 border-t border-amber-100 text-amber-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <p>Las imágenes subidas en este entorno son temporales (Blob URLs) y se perderán al recargar si no se alojan externamente.</p>
            </div>
        </div>
    );
};
