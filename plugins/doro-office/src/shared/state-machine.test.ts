import { describe, expect, it } from 'vitest';
import { resolveDororongPresentation } from './state-machine';

describe('resolveDororongPresentation', () => {
  it('maps in-progress issues to working state', () => {
    const presentation = resolveDororongPresentation('idle', [
      {
        id: 'issue-1',
        identifier: 'DOR-32',
        title: '구현 중',
        status: 'in_progress',
        updatedAt: '2026-04-11T01:00:00.000Z',
      },
    ]);

    expect(presentation.visualState).toBe('working');
    expect(presentation.bubbleText).toBe('DOR-32');
    expect(presentation.fallbackReason).toBe('issue');
  });

  it('prefers blocked issues over running state', () => {
    const presentation = resolveDororongPresentation('running', [
      {
        id: 'issue-1',
        identifier: 'DOR-40',
        title: 'blocked',
        status: 'blocked',
        updatedAt: '2026-04-11T01:00:00.000Z',
      },
    ]);

    expect(presentation.visualState).toBe('error');
  });

  it('keeps in-review issues idle while showing issue context', () => {
    const presentation = resolveDororongPresentation('idle', [
      {
        id: 'issue-2',
        identifier: 'DOR-41',
        title: 'CTO review',
        status: 'in_review',
        updatedAt: '2026-04-11T01:00:00.000Z',
      },
    ]);

    expect(presentation.visualState).toBe('idle');
    expect(presentation.bubbleText).toBe('DOR-41');
    expect(presentation.statusText).toBe('DOR-41 · in review');
    expect(presentation.fallbackReason).toBe('issue');
  });

  it('keeps todo issues idle while preserving issue summary', () => {
    const presentation = resolveDororongPresentation('idle', [
      {
        id: 'issue-3',
        identifier: 'DOR-42',
        title: '대기 중 작업',
        status: 'todo',
        updatedAt: '2026-04-11T01:00:00.000Z',
      },
    ]);

    expect(presentation.visualState).toBe('idle');
    expect(presentation.bubbleText).toBe('DOR-42');
    expect(presentation.fallbackReason).toBe('issue');
  });

  it('falls back to issue title when identifier is missing', () => {
    const presentation = resolveDororongPresentation('idle', [
      {
        id: 'issue-4',
        identifier: '',
        title: '이름 없는 작업',
        status: 'todo',
        updatedAt: '2026-04-11T01:00:00.000Z',
      },
    ]);

    expect(presentation.bubbleText).toBe('이름 없는 작업');
    expect(presentation.fallbackReason).toBe('title');
  });

  it('maps paused agents to sleeping state', () => {
    const presentation = resolveDororongPresentation('paused', []);
    expect(presentation.visualState).toBe('sleeping');
    expect(presentation.bubbleText).toBe('잠시 쉬는 중');
  });

  it('maps error agents to error state without issues', () => {
    const presentation = resolveDororongPresentation('error', []);
    expect(presentation.visualState).toBe('error');
    expect(presentation.statusText).toContain('확인');
  });

  it('falls back to idle copy when there is no active issue', () => {
    const presentation = resolveDororongPresentation('idle', []);
    expect(presentation.visualState).toBe('idle');
    expect(presentation.fallbackReason).toBe('default');
    expect(presentation.bubbleText).toBe('대기 중');
  });
});
