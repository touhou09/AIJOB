import type { PaperclipPluginManifestV1 } from '@paperclipai/plugin-sdk';

const manifest: PaperclipPluginManifestV1 = {
  id: 'dororong.doro-office',
  apiVersion: 1,
  version: '0.1.1-widget-test',
  displayName: 'Doro Office',
  description: 'Office-style Hermes agent roster for Paperclip company dashboards.',
  author: 'team-frontend',
  categories: ['ui'],
  capabilities: ['agents.read', 'ui.page.register', 'ui.sidebar.register', 'ui.dashboardWidget.register'],
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
        id: 'office-widget',
        displayName: 'Doro Office Pulse',
        exportName: 'OfficeWidget',
      },
    ],
  },
};

export default manifest;
