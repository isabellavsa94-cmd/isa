'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createRef(formData: FormData) {
  const supabase = await createClient();
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from('refs')
    .insert({
      title: (formData.get('title') as string) || null,
      url: (formData.get('url') as string) || null,
      notes: (formData.get('notes') as string) || null,
      content: (formData.get('content') as string) || null,
      collection_id: (formData.get('collection_id') as string) || null,
      tags,
      type: (formData.get('type') as string) || 'note',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/');
  redirect(`/ref/${data.id}`);
}

export async function updateRef(id: string, formData: FormData) {
  const supabase = await createClient();
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from('refs')
    .update({
      title: (formData.get('title') as string) || null,
      url: (formData.get('url') as string) || null,
      notes: (formData.get('notes') as string) || null,
      content: (formData.get('content') as string) || null,
      collection_id: (formData.get('collection_id') as string) || null,
      tags,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/');
  revalidatePath(`/ref/${id}`);
}

export async function deleteRef(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('refs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/');
  redirect('/');
}

export async function createCollection(formData: FormData) {
  const supabase = await createClient();
  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string) || null;
  if (!name) throw new Error('Name is required');

  const { error } = await supabase.from('collections').insert({ name, description });
  if (error) throw new Error(error.message);
  revalidatePath('/collections');
  revalidatePath('/');
}

export async function updateCollection(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('collections')
    .update({
      name: (formData.get('name') as string) || undefined,
      description: (formData.get('description') as string) || null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/collections');
  revalidatePath('/');
}

export async function deleteCollection(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/collections');
  revalidatePath('/');
}
