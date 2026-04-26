'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Prompt } from '@/lib/types';

const CATEGORIES = ['Copywriting', 'Estratégia', 'Criativo', 'SEO', 'Análise', 'Outro'];

function PromptCard({
  prompt,
  onCopy,
  copied,
}: {
  prompt: Prompt;
  onCopy: (id: string) => void;
  copied: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="h-40 bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden shrink-0">
        {prompt.image_url ? (
          <img
            src={prompt.image_url}
            alt={prompt.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        {prompt.category && (
          <span className="text-[10px] uppercase tracking-wider bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded w-fit">
            {prompt.category}
          </span>
        )}
        <h3 className="text-sm font-medium text-neutral-900 line-clamp-2">{prompt.title}</h3>
        {prompt.description && (
          <p className="text-xs text-neutral-500 line-clamp-2 flex-1">{prompt.description}</p>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          onClick={() => onCopy(prompt.id)}
          className={`w-full text-xs py-1.5 rounded border transition-all ${
            copied
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          {copied ? '✓ Link copiado!' : 'Copiar link'}
        </button>
      </div>
    </div>
  );
}

function AddPromptModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (p: Prompt) => void;
}) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
  };

  const uploadFile = async (): Promise<string | null> => {
    const file = fileRef.current?.files?.[0];
    if (!file) return imageUrl || null;

    const ext = file.name.split('.').pop();
    const path = `prompts/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('media').upload(path, file);
    if (upErr) throw upErr;

    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!title.trim() || !promptText.trim()) {
      setError('Título e texto do prompt são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const finalImageUrl = await uploadFile();
      const { data, error: dbErr } = await supabase
        .from('prompts')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          prompt_text: promptText.trim(),
          category: category || null,
          image_url: finalImageUrl,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      onSave(data as Prompt);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="w-full max-w-md bg-white shadow-xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h2 className="text-sm font-semibold">Novo prompt</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Título *</label>
            <input
              className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              placeholder="Nome do prompt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Descrição</label>
            <input
              className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-400"
              placeholder="Breve descrição do que faz"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Texto do prompt *</label>
            <textarea
              className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 resize-none"
              placeholder="Cole aqui o prompt completo..."
              rows={6}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Categoria</label>
            <select
              className="w-full border border-neutral-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-neutral-400 bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Sem categoria</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-neutral-500 mb-1">Imagem</label>
            <div
              className="border border-dashed border-neutral-300 rounded-lg p-4 text-center cursor-pointer hover:border-neutral-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-32 object-cover rounded" />
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-neutral-400">Clique para fazer upload</p>
                  <p className="text-[10px] text-neutral-300">PNG, JPG, WebP</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Ou cole uma URL de imagem:
            </p>
            <input
              className="w-full border border-neutral-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-neutral-400 mt-1"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>
          )}
        </div>

        <div className="p-5 border-t border-neutral-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm py-2 border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 text-sm py-2 bg-black text-white rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PromptsView({ initialPrompts }: { initialPrompts: Prompt[] }) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [showAdd, setShowAdd] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    const url = `${window.location.origin}/prompts/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = (p: Prompt) => {
    setPrompts((prev) => [p, ...prev]);
    setShowAdd(false);
  };

  return (
    <main className="flex-1 min-h-screen">
      <header className="sticky top-0 z-10 bg-neutral-50/80 backdrop-blur border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium">Biblioteca de prompts</h1>
          <p className="text-xs text-neutral-400">{prompts.length} prompt{prompts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-black text-white text-sm px-3 py-1.5 rounded hover:bg-neutral-800 transition-colors"
        >
          + Novo prompt
        </button>
      </header>

      <div className="p-6">
        {prompts.length === 0 ? (
          <div className="text-center py-20 text-sm text-neutral-500">
            Nenhum prompt ainda.{' '}
            <button onClick={() => setShowAdd(true)} className="text-neutral-900 underline">
              Adicione o primeiro
            </button>
            .
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {prompts.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                onCopy={handleCopy}
                copied={copiedId === p.id}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddPromptModal onClose={() => setShowAdd(false)} onSave={handleSave} />
      )}
    </main>
  );
}
