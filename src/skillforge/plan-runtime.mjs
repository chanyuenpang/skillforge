/**
 * plan-runtime.mjs — Minimal plan runtime engine (Phase C)
 *
 * Evaluates a PlanDTO against a set of completed/failed task IDs to produce
 * per-task runtime states, ready/blocked lists, and next-step recommendations.
 *
 * Principles:
 *  - Pure function, no I/O, no platform coupling, no model dependency
 *  - Consultant skeleton planner — tells you what's ready, never executes
 *  - "ready to run" ≠ "already executed"
 *  - Input is never mutated
 */

import {
  RUNTIME_STATUS_VALUES,
  BLOCK_REASON_VALUES,
  createRuntimeInput,
  createTaskRuntimeState,
  createRuntimeOutput,
} from './plan-runtime-contract.mjs';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a lookup map: taskId → task object
 */
function buildTaskMap(tasks) {
  const map = new Map();
  for (const task of tasks) {
    map.set(task.id, task);
  }
  return map;
}

/**
 * Build adjacency list: taskId → [dependentTaskIds] (reverse of dependsOn)
 */
function buildDependentsMap(tasks) {
  const map = new Map();
  for (const task of tasks) {
    if (!map.has(task.id)) map.set(task.id, []);
    for (const depId of task.dependsOn) {
      if (!map.has(depId)) map.set(depId, []);
      map.get(depId).push(task.id);
    }
  }
  return map;
}

/**
 * Detect cycles using DFS.
 * Returns a Set of taskIds involved in any cycle, or empty set.
 */
function detectCycles(tasks, taskMap) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  const cycleMembers = new Set();

  // Only consider edges for dependencies that actually exist
  const adj = new Map();
  for (const task of tasks) {
    adj.set(task.id, task.dependsOn.filter((depId) => taskMap.has(depId)));
  }

  function dfs(node, path) {
    color.set(node, GRAY);
    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!color.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (color.get(neighbor) === GRAY) {
        // Found cycle — mark all nodes in the cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          for (let i = cycleStart; i < path.length; i++) {
            cycleMembers.add(path[i]);
          }
        }
      }
    }
    color.set(node, BLACK);
  }

  for (const task of tasks) {
    if (!color.has(task.id)) {
      dfs(task.id, [task.id]);
    }
  }

  return cycleMembers;
}

// ── Core Engine ──────────────────────────────────────────────────────────────

/**
 * evaluatePlanRuntime(input) → PlanRuntimeOutput
 *
 * @param {PlanRuntimeInput|object} input
 *        { planDTO, completedTaskIds, failedTaskIds, activeTaskId }
 * @returns {PlanRuntimeOutput} Frozen output with task states, ready/blocked lists
 */
export function evaluatePlanRuntime(input) {
  // ── Normalize input ────────────────────────────────────────────────────────
  const planDTO = input?.planDTO ?? input;
  const tasks = Array.isArray(planDTO?.tasks) ? planDTO.tasks : [];
  const completedSet = new Set(
    Array.isArray(input?.completedTaskIds) ? input.completedTaskIds : []
  );
  const failedSet = new Set(
    Array.isArray(input?.failedTaskIds) ? input.failedTaskIds : []
  );
  const activeTaskId = input?.activeTaskId ?? null;

  // ── Empty plan guard ──────────────────────────────────────────────────────
  if (tasks.length === 0) {
    return createRuntimeOutput([], 'no tasks in plan', { taskCount: 0 });
  }

  // ── Build lookup structures ────────────────────────────────────────────────
  const taskMap = buildTaskMap(tasks);
  const allTaskIds = new Set(tasks.map((t) => t.id));
  const cycleMembers = detectCycles(tasks, taskMap);
  const dependentsMap = buildDependentsMap(tasks);

  // ── Evaluate each task ─────────────────────────────────────────────────────
  const taskStates = [];

  for (const task of tasks) {
    const blockingBy = [];
    const blockReasons = [];

    // Case 1: Already done
    if (completedSet.has(task.id)) {
      taskStates.push(createTaskRuntimeState(task.id, 'done'));
      continue;
    }

    // Case 2: Already failed
    if (failedSet.has(task.id)) {
      taskStates.push(createTaskRuntimeState(task.id, 'failed'));
      continue;
    }

    // Case 3: Currently active
    if (activeTaskId === task.id) {
      taskStates.push(createTaskRuntimeState(task.id, 'in_progress'));
      continue;
    }

    // Case 4: Evaluate dependencies
    const dependsOn = Array.isArray(task.dependsOn) ? task.dependsOn : [];

    // No dependencies → ready
    if (dependsOn.length === 0) {
      taskStates.push(createTaskRuntimeState(task.id, 'ready'));
      continue;
    }

    // Check each dependency
    let allDepsDone = true;
    let hasFailedDep = false;
    let hasSelfDep = false;
    let hasMissingDep = false;
    let hasCyclicDep = false;

    for (const depId of dependsOn) {
      // Self-dependency
      if (depId === task.id) {
        hasSelfDep = true;
        blockingBy.push(depId);
        allDepsDone = false;
        continue;
      }

      // Missing dependency (not in any task)
      if (!allTaskIds.has(depId)) {
        hasMissingDep = true;
        blockingBy.push(depId);
        allDepsDone = false;
        continue;
      }

      // Cyclic dependency
      if (cycleMembers.has(task.id) && cycleMembers.has(depId)) {
        hasCyclicDep = true;
        blockingBy.push(depId);
        allDepsDone = false;
        continue;
      }

      // Check dep status
      const depCompleted = completedSet.has(depId);
      const depFailed = failedSet.has(depId);

      if (depFailed) {
        hasFailedDep = true;
        blockingBy.push(depId);
        allDepsDone = false;
      } else if (!depCompleted) {
        // Not done and not failed → pending/blocked/in_progress → not satisfied
        blockingBy.push(depId);
        allDepsDone = false;
      }
    }

    if (allDepsDone) {
      // All dependencies satisfied
      taskStates.push(createTaskRuntimeState(task.id, 'ready'));
    } else {
      // Build block reasons
      if (hasSelfDep) blockReasons.push('self_dependency');
      if (hasMissingDep) blockReasons.push('missing_dependency');
      if (hasCyclicDep) blockReasons.push('circular_dependency');
      if (hasFailedDep && !hasSelfDep && !hasMissingDep && !hasCyclicDep) {
        blockReasons.push('predecessor_failed');
      }
      if (!hasSelfDep && !hasMissingDep && !hasCyclicDep && !hasFailedDep && blockingBy.length > 0) {
        blockReasons.push('predecessor_not_done');
      }

      const recommendation = buildBlockRecommendation(blockReasons, blockingBy);

      taskStates.push(
        createTaskRuntimeState(task.id, 'blocked', blockingBy, blockReasons, recommendation)
      );
    }
  }

  // ── Build summary ──────────────────────────────────────────────────────────
  const readyCount = taskStates.filter((t) => t.status === 'ready').length;
  const blockedCount = taskStates.filter((t) => t.status === 'blocked').length;
  const doneCount = taskStates.filter((t) => t.status === 'done').length;
  const summary = `${readyCount} ready, ${blockedCount} blocked, ${doneCount}/${tasks.length} done`;

  // ── Metadata ──────────────────────────────────────────────────────────────
  const metadata = {
    taskCount: tasks.length,
    hasCycles: cycleMembers.size > 0,
    cycleMembers: cycleMembers.size > 0 ? [...cycleMembers] : undefined,
  };

  return createRuntimeOutput(taskStates, summary, metadata);
}

// ── Recommendation Builder ───────────────────────────────────────────────────

function buildBlockRecommendation(blockReasons, blockingBy) {
  if (blockReasons.includes('self_dependency')) {
    return 'Task depends on itself — remove self-referencing dependency';
  }
  if (blockReasons.includes('missing_dependency')) {
    const missing = blockingBy.filter((id) => !blockReasons.includes('self_dependency'));
    return `Missing dependencies: ${missing.join(', ')} — verify task IDs exist in plan`;
  }
  if (blockReasons.includes('circular_dependency')) {
    return 'Task is part of a dependency cycle — break the cycle before proceeding';
  }
  if (blockReasons.includes('predecessor_failed')) {
    const failed = [...new Set(blockingBy)];
    return `Predecessor(s) failed: ${failed.join(', ')} — resolve failures before proceeding`;
  }
  if (blockReasons.includes('predecessor_not_done')) {
    const pending = [...new Set(blockingBy)];
    return `Waiting for: ${pending.join(', ')} — complete these tasks first`;
  }
  return '';
}

// ── Convenience Function ─────────────────────────────────────────────────────

/**
 * advancePlanRuntime(planDTO, completedTaskIds, failedTaskIds, activeTaskId)
 *
 * Convenience wrapper that creates RuntimeInput and evaluates.
 */
export function advancePlanRuntime(planDTO, completedTaskIds = [], failedTaskIds = [], activeTaskId = null) {
  const input = createRuntimeInput(planDTO, completedTaskIds, failedTaskIds, activeTaskId);
  return evaluatePlanRuntime(input);
}

export default {
  evaluatePlanRuntime,
  advancePlanRuntime,
  createRuntimeInput,
};
