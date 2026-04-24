import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'myplatform',
  version: '0.2.2',
  description: 'Save references to your personal platform',
  action: {
    default_popup: 'index.html',
    default_title: 'Save to myplatform',
  },
  permissions: ['storage', 'activeTab'],
  host_permissions: ['https://*.supabase.co/*'],
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+Shift+S',
        mac: 'Command+Shift+S',
      },
      description: 'Abrir myplatform',
    },
  },
});
