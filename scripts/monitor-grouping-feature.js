#!/usr/bin/env node

/**
 * Tab 分离 + 拖拽分组功能 - 监控脚本
 * 
 * 每 2 分钟运行一次，负责：
 * 1. 更新心跳
 * 2. 检查超时
 * 3. 双重检测 Agent 状态
 * 4. 状态流转
 * 5. 发送通知
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = '/Users/ppt/Projects/player-grouping/docs/grouping-feature-state.json';
const PROJECT_DIR = '/Users/ppt/Projects/player-grouping';

// 读取状态文件
function loadState() {
  try {
    const content = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ 读取状态文件失败:', error.message);
    return null;
  }
}

// 保存状态文件
function saveState(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log('✅ 状态文件已更新');
}

// 发送飞书通知
async function sendNotification(message) {
  try {
    const state = loadState();
    if (!state) return;

    const notifyTarget = state.notifyTarget;
    
    // 使用 message 工具发送通知
    // 这里用 console.log 输出，实际由 OpenClaw 处理
    console.log(`📢 通知: ${message}`);
    
    // TODO: 调用 OpenClaw message 工具发送飞书消息
    // execSync(`openclaw message send --channel feishu --target ${notifyTarget} --message "${message}"`);
  } catch (error) {
    console.error('❌ 发送通知失败:', error.message);
  }
}

// 检查 Agent 状态（双重检测）
function checkAgentStatus(state) {
  const currentPhase = state.currentPhase;
  const phaseKey = `phase${currentPhase}`;
  const phase = state.phases[phaseKey];
  
  const agentType = currentPhase <= 3 ? 'devAgent' : 'testAgent';
  const agent = phase[agentType];
  
  if (!agent || agent.status !== 'running') {
    return;
  }
  
  // 检查超时
  const startedAt = new Date(agent.startedAt);
  const elapsed = (Date.now() - startedAt.getTime()) / 1000;
  
  if (elapsed > agent.timeout) {
    console.log(`⚠️ Phase ${currentPhase} Agent 超时 (${Math.round(elapsed)}s > ${agent.timeout}s)`);
    
    agent.status = 'failed';
    phase.status = 'failed';
    
    state.failures.push({
      phase: currentPhase,
      agentType,
      reason: 'timeout',
      elapsed: Math.round(elapsed),
      timestamp: new Date().toISOString()
    });
    
    // 检查重试次数
    if (agent.retries < agent.maxRetries) {
      agent.retries++;
      agent.status = 'pending';
      phase.status = 'pending';
      
      console.log(`🔄 准备重试 Phase ${currentPhase} (${agent.retries}/${agent.maxRetries})`);
      sendNotification(`⚠️ Phase ${currentPhase} 超时，正在重试（${agent.retries}/${agent.maxRetries}）`);
    } else {
      state.status = 'failed';
      console.log(`❌ Phase ${currentPhase} 重试次数用完，需要人工介入`);
      sendNotification(`❌ Phase ${currentPhase} 多次失败，需要人工介入`);
    }
    
    saveState(state);
    return;
  }
  
  // 检查 Agent 是否还在运行
  try {
    const result = execSync('openclaw subagents list --recent 60 --json 2>/dev/null || echo "[]"', {
      encoding: 'utf-8',
      cwd: PROJECT_DIR
    });
    
    const subagents = JSON.parse(result);
    const runningAgent = subagents.find(s => s.runId === agent.runId);
    
    if (!runningAgent && agent.status === 'running') {
      // Agent 不在活跃列表中，但状态文件说还在运行
      // 可能完成了但没更新状态文件
      
      console.log(`⚠️ Agent ${agent.runId} 不在活跃列表中，但状态文件显示 running`);
      console.log('📝 可能 Agent 完成了但未更新状态文件');
      
      // 尝试读取 Agent 输出
      // TODO: 实现更完善的状态检测
    }
  } catch (error) {
    console.error('❌ 检查 Agent 状态失败:', error.message);
  }
}

// 状态流转
function transitionState(state) {
  const currentPhase = state.currentPhase;
  const phaseKey = `phase${currentPhase}`;
  const phase = state.phases[phaseKey];
  
  if (!phase) {
    console.error(`❌ Phase ${currentPhase} 不存在`);
    return;
  }
  
  const agentType = currentPhase <= 3 ? 'devAgent' : 'testAgent';
  const agent = phase[agentType];
  
  console.log(`\n📊 Phase ${currentPhase} 状态: ${phase.status}`);
  console.log(`   Agent 状态: ${agent?.status || 'N/A'}`);
  
  if (phase.status === 'completed') {
    // 当前 Phase 完成，进入下一阶段
    if (currentPhase === 5) {
      // 全部完成
      state.status = 'completed';
      state.completedAt = new Date().toISOString();
      
      console.log('\n🎉 所有 Phase 完成！');
      sendNotification('🎉 功能完成！所有测试通过。\n\n' +
        `📊 测试结果:\n` +
        `- 单元测试: ${state.testResults.unit.passed} passed, 覆盖率 ${state.testResults.unit.coverage}%\n` +
        `- 组件测试: ${state.testResults.component.passed} passed, 覆盖率 ${state.testResults.component.coverage}%\n` +
        `- 集成测试: ${state.testResults.integration.passed} passed\n` +
        `- E2E 测试: ${state.testResults.e2e.passed} passed\n\n` +
        `🔗 部署地址: ${state.deployUrl}`);
      
      saveState(state);
      return;
    }
    
    // 进入下一 Phase
    const nextPhase = currentPhase + 1;
    const nextPhaseKey = `phase${nextPhase}`;
    
    state.currentPhase = nextPhase;
    state.phases[nextPhaseKey].status = 'pending';
    
    console.log(`\n➡️ 进入 Phase ${nextPhase}`);
    sendNotification(`✅ Phase ${currentPhase} 完成，进入 Phase ${nextPhase}`);
    
    saveState(state);
  } else if (phase.status === 'pending') {
    console.log(`⏳ Phase ${currentPhase} 等待 Agent 启动...`);
  } else if (phase.status === 'running') {
    console.log(`🔄 Phase ${currentPhase} Agent 运行中...`);
  } else if (phase.status === 'failed') {
    console.log(`❌ Phase ${currentPhase} 已失败，等待人工介入`);
  }
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log(`🔍 监控检查 - ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(60));
  
  const state = loadState();
  if (!state) {
    console.error('❌ 无法加载状态文件');
    return;
  }
  
  // 1. 更新心跳
  state.heartbeat.lastCheck = new Date().toISOString();
  state.heartbeat.nextCheck = new Date(Date.now() + 120000).toISOString();
  
  // 2. 检查 Agent 状态（含超时检测）
  checkAgentStatus(state);
  
  // 3. 状态流转
  transitionState(state);
  
  // 4. 保存状态
  saveState(state);
  
  console.log('\n✅ 监控检查完成');
  console.log(`⏰ 下次检查: ${state.heartbeat.nextCheck}`);
}

main().catch(console.error);
