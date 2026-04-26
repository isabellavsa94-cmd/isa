import { Sidebar } from '@/components/Sidebar';
import { EditorView } from './EditorView';

export default function EditorPage() {
  return (
    <div className="flex">
      <Sidebar activeSection="editor" />
      <EditorView />
    </div>
  );
}
