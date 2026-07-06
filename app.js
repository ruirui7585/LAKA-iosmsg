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
let currentUserType = 'receiver'; // 当前用户类型: receiver(接收方) / sender(发起方)
let profileSendState = 'first'; // Profile 打招呼状态: first(首次发送) / 7day(7天后发送) / cooldown(冷却中)

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

// ========== 用户类型切换 ==========
function switchUserType(type) {
  currentUserType = type;

  // 更新 tab 样式
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // 根据用户类型动态切换 IM 状态机按钮
  updateImMachineButtons(type);

  // 根据用户类型控制右侧底部按钮的显隐
  const receiverActions = document.querySelectorAll('.receiver-actions');
  receiverActions.forEach(el => {
    el.style.display = type === 'receiver' ? '' : 'none';
  });

  if (type === 'receiver') {
    // 接收方：显示完整状态机（原始状态）
    statusLog.innerHTML =
      '<b>用户类型：接收方</b><br/>' +
      '可操作 IM 状态机（Accept / Reject / Block / Reset）。<br/>' +
      '在 For You 或 Profile 场景点击对方 Hi 后，可在此处处理请求。';
  } else {
    // 发起方：显示发送方状态机（发送第1条消息 / 输入框置灰）
    statusLog.innerHTML =
      '<b>用户类型：发起方</b><br/>' +
      '点击 For You / Profile 页面的 Hi 按钮发起请求。<br/>' +
      '发起方只看到 toast："已向对方发起请求"，无法知道对方是否接受/拒绝。<br/>' +
      'IM 页面显示等待状态，对方接受后才会建立聊天。';
  }

  showToast(type === 'receiver' ? '已切换到接收方视角' : '已切换到发起方视角');
}

// ========== 根据用户类型更新 IM 状态机按钮 ==========
function updateImMachineButtons(type) {
  const imMachine = document.getElementById('imMachine');
  const block = imMachine.querySelector('.machine-block');

  if (type === 'receiver') {
    // 接收方：原始状态机（Accept / Reject / Block / Reset）
    block.innerHTML =
      '<h3>IM 接收方状态机</h3>' +
      '<p>模拟接收方在 message request 状态下的处理。</p>' +
      '<div class="machine-actions">' +
        '<button class="accept" onclick="setImState(\'pending\')">Accept</button>' +
        '<button class="reject" onclick="setImState(\'reject\')">Reject</button>' +
        '<button class="block" onclick="setImState(\'blocked\')">Block</button>' +
        '<button class="reject" onclick="resetImState()">Reset</button>' +
      '</div>';
  } else {
    // 发起方：现在的状态机（发送第1条消息 / 输入框置灰 / Block / Reset）
    block.innerHTML =
      '<h3>IM 发起方状态机</h3>' +
      '<p>模拟发起方在 message request 状态下的两种子状态。</p>' +
      '<div class="machine-actions">' +
        '<button class="accept" onclick="setImState(\'pending\')">发送第1条消息</button>' +
        '<button class="block" onclick="setImState(\'inputDisabled\')">输入框置灰</button>' +
        '<button class="reject" onclick="resetImState()">Reset</button>' +
      '</div>';
  }
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
    statusLog.innerHTML =
      '<b>For You 场景:</b><br/>' +
      '点击用户卡片进入 Profile 个人主页。';
    // For You 下：只保留发起方，隐藏等级
    restrictToSender(true);
  }

  if (page === 'profile') {
    document.getElementById('profileMachine').classList.add('active');
    var stateNames = { first: '首次发送', '7day': '7天后发送', cooldown: '冷却中' };
    statusLog.innerHTML =
      '<b>Profile 场景:</b><br/>' +
      '当前打招呼状态: <b>' + stateNames[profileSendState] + '</b><br/>' +
      '点击底部打招呼按钮测试不同状态下的行为。';
    // Profile 下：只保留发起方，隐藏等级
    restrictToSender(true);
  }

  if (page === 'im') {
    document.getElementById('imMachine').classList.add('active');
    // 恢复完整选择器
    restrictToSender(false);
    // 同步更新 IM 状态机按钮（根据用户类型）
    updateImMachineButtons(currentUserType);
    statusLog.innerHTML =
      '<b>IM 场景:</b><br/>' +
      (currentUserType === 'receiver'
        ? '当前测试接收方 message request 处理链路：Accept / Reject / Block / Reset。'
        : '当前测试发起方 message request 子状态：发送第1条消息 / 输入框置灰 / Reset。');
  }
}

// ========== For You / Profile 下限制为发起方并隐藏等级 ==========
function restrictToSender(restrict) {
  const receiverBtn = document.getElementById('receiverBtn');
  const levelSection = document.getElementById('levelSection');

  if (restrict) {
    // 隐藏接收方按钮，只保留发起方
    receiverBtn.style.display = 'none';
    // 隐藏等级选择器
    levelSection.style.display = 'none';
    // 强制切换到发起方
    if (currentUserType !== 'sender') {
      switchUserType('sender');
    }
  } else {
    // 恢复接收方按钮
    receiverBtn.style.display = '';
    // 恢复等级选择器
    levelSection.style.display = '';
  }
}

// ========== Profile 打招呼状态切换 ==========
function setProfileSendState(state) {
  profileSendState = state;
  var stateNames = { first: '首次发送', '7day': '7天后发送', cooldown: '冷却中' };
  statusLog.innerHTML =
    '<b>Profile 打招呼状态:</b><br/>' +
    '当前状态: <b>' + stateNames[state] + '</b><br/>' +
    (state === 'cooldown'
      ? '点击打招呼按钮 → 进入会话框，底部输入框置灰，无法发送消息。'
      : '点击打招呼按钮 → 进入会话框，自动发送1条文本消息。');
  showToast('已切换到: ' + stateNames[state]);
}

function resetProfileSendState() {
  profileSendState = 'first';
  statusLog.innerHTML =
    '<b>Profile 打招呼状态:</b><br/>' +
    '已重置为默认状态: 首次发送。';
  showToast('状态已重置');
}

// ========== 发送 Hi 请求 ==========
function sendHi(source, name) {
  if (currentUserType === 'sender') {
    // 发起方视角
    if (source === 'home') lastHomeRequest = name;
    if (source === 'profile') lastProfileRequest = name;

    if (source === 'home') {
      // For You 下点击打招呼：IM 默认进入"发送第1条消息"输入框状态
      switchImPanel('pendingPanel');
      showPage('im');
      statusLog.innerHTML =
        '<b>发起方视角:</b><br/>' +
        '已向 ' + name + ' 发起请求。<br/>' +
        'IM 已进入"发送第1条消息"状态，可输入文本发送。';
    } else {
      // Profile 下：根据打招呼状态决定行为
      if (source === 'profile') lastProfileRequest = name;

      if (profileSendState === 'cooldown') {
        // 冷却中：进入会话框，输入框置灰
        switchImPanel('inputDisabledPanel');
        showPage('im');
        statusLog.innerHTML =
          '<b>发起方视角（冷却中）:</b><br/>' +
          '已向 ' + name + ' 发起请求。<br/>' +
          '当前处于冷却状态，输入框置灰，无法发送消息。';
      } else {
        // 首次发送 / 7天后发送：进入会话框，自动发送1条消息
        switchImPanel('profileAutoSentPanel');
        showPage('im');

        // 自动发送一条打招呼消息到对话框中
        var greeting = profileSendState === '7day' ? 'Hi! Long time no see 👋' : 'Hi! 👋';
        var bubble = document.getElementById('messageBubble');
        if (bubble) {
          bubble.textContent = greeting;
          bubble.style.display = 'block';
        }
        var hint = document.getElementById('messageHint');
        if (hint) {
          hint.textContent = 'Message request sent.';
          hint.style.display = 'block';
        }

        statusLog.innerHTML =
          '<b>发起方视角（' + (profileSendState === '7day' ? '7天后发送' : '首次发送') + '）:</b><br/>' +
          '已向 ' + name + ' 发起请求。<br/>' +
          '自动发送消息："' + greeting + '"<br/>' +
          '消息显示在对话框中，下方提示：Message request sent.';
      }
    }
  } else {
    // 接收方视角：在原页面等待对方处理
    if (source === 'home') {
      lastHomeRequest = name;
      statusLog.innerHTML = '<b>For You:</b><br/>已向 ' + name + ' 发起请求。等待对方处理。发起方当前只看到 toast，不知道后续结果。';
    }
    if (source === 'profile') {
      lastProfileRequest = name;
      statusLog.innerHTML = '<b>Profile:</b><br/>已向 ' + name + ' 发起请求。等待对方处理。发起方当前只看到 toast，不知道后续结果。';
    }
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

  // 根据当前用户类型重置到对应状态
  if (currentUserType === 'sender') {
    switchImPanel('deletedPanel'); // 发起方视角：重置到默认删除状态
    if (document.getElementById('imScreen').classList.contains('active')) {
      showPage('home');
    }
    statusLog.innerHTML =
      '<b>Reset（发起方）:</b><br/>' +
      (source === 'home' ? 'For You' : 'Profile') +
      ' 请求状态已重置。<br/>可重新点击 Hi 发起请求。';
  } else {
    switchImPanel('pendingPanel'); // 接收方视角：重置到 pending 状态
    statusLog.innerHTML =
      '<b>Reset（接收方）:</b><br/>' +
      (source === 'home' ? 'For You' : 'Profile') +
      ' 请求状态已重置，可重新点击 Hi 测试。';
  }

  showToast('状态已重置');
}

// ========== 准备已接受的 IM 界面 ==========
function prepareAcceptedIm(name) {
  document.getElementById('imName').textContent = name;
  document.getElementById('imCardName').innerHTML = name + ' <span class="flag">🇮🇴</span>';
  document.getElementById('requestTitle').textContent = "You accepted " + name + "'s message request";
  document.getElementById('requestDesc').textContent = "The conversation is now active. You can start chatting.";
  document.getElementById('systemTip').textContent = "Request accepted. Start chatting.";
  document.getElementById('messageBubble').style.display = 'none';
  switchImPanel('acceptedPanel');
}

function switchImPanel(id) {
  ['pendingPanel', 'inputDisabledPanel', 'blockedPanel', 'deletedPanel', 'acceptedPanel', 'rejectedPanel', 'senderWaitingPanel', 'profileAutoSentPanel'].forEach(panelId => {
    const el = document.getElementById(panelId);
    if (el) el.classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  currentImPanel = id;
}

// ========== 设置 IM 状态 ==========
function setImState(state) {
  if (state === 'reject') {
    switchImPanel('rejectedPanel');
    document.getElementById('requestTitle').textContent = 'Message request rejected';
    document.getElementById('requestDesc').textContent = 'The sender will be notified that you declined the request.';
    document.getElementById('systemTip').textContent = 'This request has been rejected.';
    document.getElementById('messageBubble').style.display = 'none';
    statusLog.innerHTML =
      '<b>IM → Reject:</b><br/>' +
      '接收方已 Reject 请求。发起方会收到请求被拒绝的通知。';
    showToast('IM 请求已 Reject');
    return;
  }

  if (state === 'inputDisabled') {
    switchImPanel('inputDisabledPanel');
    document.getElementById('requestTitle').textContent = 'Message request received';
    document.getElementById('requestDesc').textContent = 'Wait for them to accept your request before you can chat.';
    document.getElementById('systemTip').textContent = 'Input is currently disabled.';
    document.getElementById('messageBubble').style.display = 'none';
    document.getElementById('messageHint').style.display = 'none';
    statusLog.innerHTML =
      '<b>IM → 输入框置灰:</b><br/>' +
      '接收方进入 message request，但输入框处于置灰状态，无法输入文本。<br/>' +
      '可操作 Block / Delete / Accept 按钮。';
    showToast('输入框已置灰');
    return;
  }

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
  document.getElementById('messageHint').style.display = 'none';
  switchImPanel('pendingPanel');

  statusLog.innerHTML =
    '<b>IM Reset:</b><br/>' +
    'IM 接收方状态已重置，可重新测试 Block / Delete / Accept。';

  showToast('IM 状态已重置');
}

// ========= 接收方在 pending 状态下发送消息 =========
function sendPendingMessage() {
  const input = document.getElementById('pendingInput');
  const msg = input.textContent.trim();
  if (!msg || msg === 'Say something...') return;

  // 显示消息气泡
  const bubble = document.getElementById('messageBubble');
  bubble.textContent = msg;
  bubble.style.display = 'block';

  // 显示 Message request sent. 灰色提示
  const hint = document.getElementById('messageHint');
  hint.textContent = 'Message request sent.';
  hint.style.display = 'block';

  // 清空输入框
  input.textContent = 'Say something...';

  showToast('Message sent');
  statusLog.innerHTML =
    '<b>Pending → Reply:</b><br/>' +
    '接收方已回复消息："' + msg + '"<br/>' +
    '消息下方显示灰色提示：Message request sent.';
}

// ========== 发起方输入框发送消息 ==========
function sendSenderMessage() {
  const input = document.getElementById('senderInput');
  const msg = input.textContent.trim();
  if (!msg || msg === 'Say something...') return;

  // 清空输入框
  input.textContent = 'Say something...';

  showToast('Message sent');
  statusLog.innerHTML =
    '<b>发送方 → Reply:</b><br/>' +
    '发起方已发送消息："' + msg + '"<br/>' +
    '等待对方回复。';
}

// ========== Accept 后输入框发送消息 ==========
function sendAcceptedMessage() {
  const input = document.getElementById('acceptedInput');
  const msg = input.textContent.trim();
  if (!msg || msg === 'Say something...') return;

  // 清空输入框
  input.textContent = 'Say something...';

  showToast('Message sent');
  statusLog.innerHTML =
    '<b>Accepted → Reply:</b><br/>' +
    '已发送消息："' + msg + '"';
}

// ========== Profile 自动发送后再输入消息 ==========
function sendProfileAutoSentMessage() {
  const input = document.getElementById('profileAutoSentInput');
  const msg = input.textContent.trim();
  if (!msg || msg === 'Say something...') return;

  // 清空输入框
  input.textContent = 'Say something...';

  showToast('Message sent');
  statusLog.innerHTML =
    '<b>Profile → Auto-sent → Reply:</b><br/>' +
    '已发送消息："' + msg + '"';
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
// ========== 初始加载：根据默认用户类型设置 IM 状态机按钮 ==========
updateImMachineButtons(currentUserType);
// 初始限制为发起方（默认在 For You tab）
restrictToSender(true);

// 初始设置右侧底部按钮显隐
document.querySelectorAll('.receiver-actions').forEach(el => { el.style.display = currentUserType === 'receiver' ? '' : 'none'; });
