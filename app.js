// ========== 全局状态变量 ==========
const pageMap = {
  home: document.getElementById('homeScreen'),
  profile: document.getElementById('profileScreen'),
  im: document.getElementById('imScreen')
};

const toast = document.getElementById('toast');
const statusLog = document.getElementById('statusLog');

let lastHomeRequest = null;
let lastProfileRequest = null;
let currentImPanel = 'deletedPanel'; // 当前 IM 面板状态: pending(=a), accepted(=b/s), blocked(=c), deleted(=d)
let currentUserLevel = 's'; // 当前用户等级: s / a / b / c / d

// ========== 等级切换 ==========
function switchLevel(level) {
  currentUserLevel = level;

  // 更新 tab 样式
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });

  const levelNames = { s: 'S 级', a: 'A 级', b: 'B 级', c: 'C 级', d: 'D 级' };
  showToast('已切换到 ' + levelNames[level] + ' 用户');
  statusLog.innerHTML =
    '<b>等级切换:</b><br/>当前用户等级: <b>' + levelNames[level] + '</b> (' + level.toUpperCase() + ')。' +
    '<br/><br/>等级说明：<br/>' +
    '- S/A/B 级：视频通话可用<br/>' +
    '- C/D 级：视频通话不可用，提示"你的等级暂不支持使用"';
}

// ========== Toast 提示 ==========
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1400);
}

// ========== 页面切换 ==========
function showPage(page) {
  Object.values(pageMap).forEach(el => el.classList.remove('active'));
  pageMap[page].classList.add('active');

  document.querySelectorAll('.switcher button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  document.querySelectorAll('.machine-scene').forEach(scene => {
    scene.classList.remove('active');
  });

  if (page === 'home') {
    document.getElementById('homeMachine').classList.add('active');
    statusLog.innerHTML =
      '<b>For You 场景:</b><br/>' +
      '当前测试列表页点击 Hi 后的请求链路。点击 Hi 后只 toast：已向对方发起请求。';
  }

  if (page === 'profile') {
    document.getElementById('profileMachine').classList.add('active');
    statusLog.innerHTML =
      '<b>Profile 场景:</b><br/>' +
      '当前测试个人资料页点击 Say Hi 后的请求链路。点击 Say Hi 后只 toast：已向对方发起请求。';
  }

  if (page === 'im') {
    document.getElementById('imMachine').classList.add('active');
    statusLog.innerHTML =
      '<b>IM 场景:</b><br/>' +
      '当前测试接收方 message request 处理链路：Block / Delete / Accept。';
  }
}

// ========== 发送 Hi 请求 ==========
function sendHi(source, name) {
  showToast('已向对方发起请求');

  if (source === 'home') {
    lastHomeRequest = name;
    statusLog.innerHTML = '<b>For You:</b><br/>已向 ' + name + ' 发起请求。等待对方处理。发起方当前只看到 toast，不知道后续结果。';
  }

  if (source === 'profile') {
    lastProfileRequest = name;
    statusLog.innerHTML = '<b>Profile:</b><br/>已向 ' + name + ' 发起请求。等待对方处理。发起方当前只看到 toast，不知道后续结果。';
  }
}

// ========== 处理 Hi 请求结果 ==========
function resolveHi(source, result) {
  const name = source === 'home' ? (lastHomeRequest || 'love') : (lastProfileRequest || 'love');

  if (result === 'accept') {
    statusLog.innerHTML =
      '<b>' + (source === 'home' ? 'For You' : 'Profile') + ' → Accept:</b><br/>' +
      '对方接受请求。系统自动进入 IM，并成功发送一条打招呼消息。';

    prepareAcceptedIm(name);
    showPage('im');
    showToast('对方已接受，消息已发送');
    return;
  }

  if (result === 'reject') {
    statusLog.innerHTML =
      '<b>' + (source === 'home' ? 'For You' : 'Profile') + ' → Reject:</b><br/>' +
      '对方拒绝请求。发起方不收到明确失败反馈，页面保持原状态。';
    showToast('测试状态：对方拒绝，发起方无反馈');
    return;
  }

  if (result === 'block') {
    statusLog.innerHTML =
      '<b>' + (source === 'home' ? 'For You' : 'Profile') + ' → Block:</b><br/>' +
      '对方 Block 请求。发起方不收到明确失败反馈，避免暴露对方处理行为。';
    showToast('测试状态：对方Block，发起方无反馈');
  }
}

// ========== 重置 Hi 请求 ==========
function resetHi(source) {
  if (source === 'home') lastHomeRequest = null;
  if (source === 'profile') lastProfileRequest = null;

  statusLog.innerHTML =
    '<b>Reset:</b><br/>' +
    (source === 'home' ? 'For You' : 'Profile') +
    ' 请求状态已重置，可重新点击 Hi 测试。';

  showToast('状态已重置');
}

// ========== 准备已接受的 IM 界面 ==========
function prepareAcceptedIm(name) {
  document.getElementById('imName').textContent = name;
  document.getElementById('imCardName').innerHTML = name + ' <span class="flag">🇮🇴</span>';
  document.getElementById('requestTitle').textContent = "You accepted " + name + "'s message request";
  document.getElementById('requestDesc').textContent = "The conversation is now active. A greeting message has been sent.";
  document.getElementById('systemTip').textContent = "Request accepted. Greeting message sent successfully.";
  document.getElementById('messageBubble').style.display = 'block';
  switchImPanel('acceptedPanel');
}

// ========== IM 面板切换 ==========
function switchImPanel(id) {
  ['pendingPanel', 'blockedPanel', 'deletedPanel', 'acceptedPanel'].forEach(panelId => {
    document.getElementById(panelId).classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  currentImPanel = id; // 追踪当前状态
}

// ========== 设置 IM 状态 ==========
function setImState(state) {
  if (state === 'blocked') {
    switchImPanel('blockedPanel');
    document.getElementById('requestTitle').textContent = 'You blocked this request';
    document.getElementById('requestDesc').textContent = 'The sender will not receive a direct rejection notice.';
    document.getElementById('systemTip').textContent = 'This request has been blocked.';
    document.getElementById('messageBubble').style.display = 'none';
    statusLog.innerHTML =
      '<b>IM → Block:</b><br/>' +
      '接收方已 Block 请求。发起方侧不收到明确失败反馈。';
    showToast('IM 请求已 Block');
  }

  if (state === 'deleted') {
    switchImPanel('deletedPanel');
    document.getElementById('requestTitle').textContent = 'Message request deleted';
    document.getElementById('requestDesc').textContent = 'The sender side remains silent.';
    document.getElementById('systemTip').textContent = 'This request has been removed.';
    document.getElementById('messageBubble').style.display = 'none';
    statusLog.innerHTML =
      '<b>IM → Delete:</b><br/>' +
      '接收方已 Delete 请求。发起方侧不收到明确失败反馈。';
    showToast('IM 请求已 Delete');
  }

  if (state === 'accepted') {
    prepareAcceptedIm('Amar');
    statusLog.innerHTML =
      '<b>IM → Accept:</b><br/>' +
      '接收方已接受请求。底部恢复输入框，聊天关系建立。';
    showToast('IM 请求已 Accept');
  }
}

// ========== 重置 IM 状态 ==========
function resetImState() {
  document.getElementById('imName').textContent = 'Amar';
  document.getElementById('imCardName').innerHTML = 'Amar <span class="flag">🇮🇶</span>';
  document.getElementById('requestTitle').textContent = 'Accept message request from Amar?';
  document.getElementById('requestDesc').textContent = 'If you accept, he can continue chatting with you and see limited chat-related status.';
  document.getElementById('systemTip').textContent = '【Match】 He is a good match for you. Accept the request before starting the conversation.';
  document.getElementById('messageBubble').style.display = 'none';
  switchImPanel('pendingPanel');

  statusLog.innerHTML =
    '<b>IM Reset:</b><br/>' +
    'IM 接收方状态已重置，可重新测试 Block / Delete / Accept。';

  showToast('IM 状态已重置');
}

// ========== 视频通话按钮点击处理 ==========
// 可用等级: s, a, b — 支持使用
// 不可用等级: c, d — 弹出等级提示
function handleVideoCall() {
  const usableLevels = ['s', 'a', 'b'];
  const unusableLevels = ['c', 'd'];

  if (usableLevels.includes(currentUserLevel)) {
    // 可用：支持使用（模拟发起视频通话）
    showToast('正在发起视频通话...');
    statusLog.innerHTML =
      '<b>视频通话:</b><br/>当前用户等级(' + currentUserLevel.toUpperCase() + ')允许使用视频通话功能。已发起通话请求。';
  } else {
    // 不可用：弹出等级限制提示
    showToast('你的等级暂不支持使用');
    statusLog.innerHTML =
      '<b>视频通话 - 限制:</b><br/>当前用户等级(' + currentUserLevel.toUpperCase() + ')不支持视频通话。<br/>弹出 toast: "你的等级暂不支持使用"<br/>引导用户升级到 A 级以上解锁。';
  }
}

// ========== 视频标记点击提示 ==========
function showVideoTooltip() {
  const tooltip = document.getElementById('videoTooltip');
  if (!tooltip) return;

  // 显示 tooltip
  tooltip.classList.add('show');

  // 2 秒后自动消失
  setTimeout(() => {
    tooltip.classList.remove('show');
  }, 2000);
}