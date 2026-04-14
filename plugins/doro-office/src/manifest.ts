import type { PaperclipPluginManifestV1 } from '@paperclipai/plugin-sdk';

const manifest: PaperclipPluginManifestV1 = {
  id: 'dororong.doro-office',
  apiVersion: 1,
  version: '0.1.4',
  displayName: 'Doro Office',
  description: 'Realtime office-layout Hermes agent roster with timeline, pulse widget, and persisted scene editor for Paperclip company dashboards.',
  author: 'team-frontend',
  categories: ['ui'],
  capabilities: ['agents.read', 'plugin.state.read', 'plugin.state.write', 'ui.page.register', 'ui.sidebar.register', 'ui.dashboardWidget.register'],
  entrypoints: {
    worker: 'dist/worker.js',
    ui: 'dist/ui',
  },
  ui: {
    slots: [
      {
        type: 'page',
        id: 'office-page',
        displayName: 'Doro Office',
        exportName: 'OfficePage',
        routePath: 'office',
      },
      {
        type: 'sidebar',
        id: 'office-sidebar',
        displayName: 'Doro Office',
        exportName: 'OfficeSidebar',
      },
      {
        type: 'dashboardWidget',
        id: 'office-pulse-widget',
        displayName: 'Doro Office Pulse',
        exportName: 'PulseWidget',
      },
    ],
  },
};

export default manifest;
