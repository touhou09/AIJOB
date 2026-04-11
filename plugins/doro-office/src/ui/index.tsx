import type { PluginPageProps, PluginSidebarProps, PluginWidgetProps } from '@paperclipai/plugin-sdk/ui';
import './styles.css';
import { OfficePageView } from './OfficePage';

export function OfficePage(props: PluginPageProps) {
  return <OfficePageView context={props.context} mode="page" />;
}

export function OfficeSidebar(props: PluginSidebarProps) {
  return <OfficePageView context={props.context} mode="sidebar" />;
}

export function OfficeWidget(props: PluginWidgetProps) {
  return <OfficePageView context={props.context} mode="sidebar" />;
}
