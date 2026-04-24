import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

type Collection = { id: string; name: string };
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type LinkItem = { text: string; url: string };
type ExtractedContent = {
  title: string;
  content: string;
  excerpt: string | null;
  byline: string | null;
  selection: string;
  links: LinkItem[];
  extractor: 'readability' | 'body-fallback';
};

export function SaveForm() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedContent | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('collections')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        const cols = (data ?? []) as Collection[];
        setCollections(cols);
        const inbox = cols.find((c) => c.name === 'inbox');
        setCollectionId(inbox?.id ?? cols[0]?.id ?? '');
      });

    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(async (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) return;
        setTitle(tab.title ?? '');
        setUrl(tab.url ?? '');

        try {
          const response = (await chrome.tabs.sendMessage(tab.id, {
            type: 'EXTRACT_CONTENT',
          })) as { ok: boolean; data?: ExtractedContent; error?: string };

          if (response?.ok && response.data) {
            setExtracted(response.data);
            if (response.data.title) setTitle(response.data.title);
            if (response.data.selection) setNotes(response.data.selection);
          } else {
            setExtractError(response?.error ?? 'unknown');
          }
        } catch {
          setExtractError('Página não suporta extração (chrome://, PDF, etc.)');
        }
      });
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setStatus('saving');
    setError(null);

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase.from('refs').insert({
      title: title || null,
      url: url || null,
      collection_id: collectionId || null,
      tags: tagArray,
      notes: notes || null,
      content: extracted?.content ?? null,
      type: 'page',
      metadata: extracted
        ? {
            excerpt: extracted.excerpt,
            byline: extracted.byline,
            links: extracted.links,
            extractor: extracted.extractor,
          }
        : {},
    });

    if (error) {
      setStatus('error');
      setError(error.message);
    } else {
      setStatus('saved');
      setTimeout(() => window.close(), 700);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const inputCls =
    'w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:border-gray-900';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-base font-semibold">Save to myplatform</h1>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Logout
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`${inputCls} text-gray-500`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Collection</label>
          <select
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
            className={`${inputCls} bg-white`}
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Tags <span className="text-gray-400">(vírgula separa)</span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="marketing, copywriting"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Por que você está salvando isso?"
            className={`${inputCls} resize-none`}
          />
        </div>

        {extracted && (
          <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
            📄 {extracted.content.length.toLocaleString()} chars ·{' '}
            {extracted.links.length} link{extracted.links.length === 1 ? '' : 's'} ·{' '}
            <span className="text-gray-400">{extracted.extractor}</span>
            {extracted.byline && <> · {extracted.byline}</>}
          </div>
        )}
        {extractError && !extracted && (
          <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            ⚠ Sem conteúdo capturado — só URL e título serão salvos
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === 'saving' || status === 'saved'}
          className="w-full bg-black text-white text-sm py-2 rounded disabled:opacity-50 hover:bg-gray-800"
        >
          {status === 'saving' && 'Saving…'}
          {status === 'saved' && 'Saved ✓'}
          {(status === 'idle' || status === 'error') && 'Save'}
        </button>
      </form>
    </div>
  );
}
