import type { Agent } from '@paperclipai/plugin-sdk';
import type { AgentIssueSnapshot, DororongPresentation, DororongVisualState } from './types';

const workingStatuses = new Set<Agent['status']>(['active', 'running']);
const sleepingStatuses = new Set<Agent['status']>(['paused', 'terminated']);
const errorStatuses = new Set<Agent['status']>(['error']);

const issuePriorityOrder: ReadonlyArray<AgentIssueSnapshot['status']> = ['blocked', 'in_progress', 'in_review', 'todo'];

const fallbackBubbleMap: Record<DororongVisualState, string> = {
  idle: '대기 중',
  working: '작업 중',
  error: '확인 필요',
  sleeping: '잠시 쉬는 중',
};

const fallbackStatusTextMap: Record<DororongVisualState, string> = {
  idle: '새 작업을 기다리고 있어요.',
  working: '현재 작업을 처리하고 있어요.',
  error: '에이전트 상태 또는 이슈를 확인해 주세요.',
  sleeping: '휴면/일시정지 상태예요.',
};

function pickPrimaryIssue(issues: AgentIssueSnapshot[]) {
  return [...issues].sort((left, right) => {
    const leftPriority = issuePriorityOrder.indexOf(left.status);
    const rightPriority = issuePriorityOrder.indexOf(right.status);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  })[0] ?? null;
}

export function resolveDororongPresentation(agentStatus: Agent['status'], issues: AgentIssueSnapshot[]): DororongPresentation {
  const currentIssue = pickPrimaryIssue(issues);

  let visualState: DororongVisualState = 'idle';
  if (currentIssue?.status === 'blocked' || errorStatuses.has(agentStatus)) {
    visualState = 'error';
  } else if (sleepingStatuses.has(agentStatus)) {
    visualState = 'sleeping';
  } else if (currentIssue?.status === 'in_progress' || workingStatuses.has(agentStatus)) {
    visualState = 'working';
  }

  const bubbleText = currentIssue?.identifier || currentIssue?.title || fallbackBubbleMap[visualState];
  const statusText = currentIssue ? `${currentIssue.identifier} · ${currentIssue.status.replace(/_/g, ' ')}` : fallbackStatusTextMap[visualState];
  const fallbackReason: DororongPresentation['fallbackReason'] = currentIssue?.identifier
    ? 'issue'
    : currentIssue?.title
      ? 'title'
      : 'default';

  return {
    visualState,
    bubbleText,
    statusText,
    fallbackReason,
    currentIssue,
  };
}
