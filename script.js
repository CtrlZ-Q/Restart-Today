const times = ["早晨", "上午", "中午", "下午", "傍晚", "夜晚"];

const initialStats = {
  stress: 40,
  focus: 50,
  relation: 30,
  self: 20,
  progress: 0,
};

const clueTexts = {
  overwork: "连续赶工会让压力失控，不能只靠硬撑过完今天。",
  friendAtNoon: "中午去天台更容易遇到朋友。",
  askHelp: "关系足够或获得提醒后，可以向老师 / 学长求助。",
  interest: "兴趣活动会影响最后的自我认同，不是无关选项。",
  earlyRest: "休息不能拖到完全崩溃之后。",
};

const clueMeta = {
  overwork: { group: "节奏", label: "压力失控" },
  friendAtNoon: { group: "连接", label: "中午天台" },
  askHelp: { group: "连接", label: "求助入口" },
  interest: { group: "自我", label: "别丢掉自己" },
  earlyRest: { group: "节奏", label: "提前恢复" },
};

const strategyDefs = [
  {
    id: "steady",
    name: "稳住节奏",
    desc: "休息额外 -10 压力，学习压力 -5。适合先把今天稳下来。",
  },
  {
    id: "sprint",
    name: "冲刺提交",
    desc: "学习和求助额外 +10 进度，但学习额外 +8 压力。适合补进度。",
  },
  {
    id: "connect",
    name: "先找连接",
    desc: "聊天额外 +10 关系，求助额外 +5 进度。适合打开求助路线。",
  },
];

const scenes = {
  bedroom: {
    title: "卧室",
    text: "手机闹钟第三次响起。今天是课程作品提交前最后一天，你知道自己又回到了同一个早晨。",
  },
  desk: {
    title: "书桌",
    text: "便签、草稿和未完成的作品堆在桌上。每推进一点，时间也往前压一格。",
  },
  rooftop: {
    title: "天台",
    text: "风把操场上的声音吹得很远。有人在这里短暂停下来，也有人在这里重新开口。",
  },
  office: {
    title: "办公室 / 聊天窗口",
    text: "消息框闪了闪。求助并不代表失败，只是承认今天不必一个人扛完。",
  },
  hobby: {
    title: "角落里的画本",
    text: "你翻到很久没碰的画本。它不直接推进作品，却让你想起为什么开始。",
  },
};

const actions = [
  {
    id: "study",
    name: "学习 / 赶工",
    desc: "推进任务并提高专注。专注高时收益更好，连续选择会积累压力。",
    scene: "desk",
    apply() {
      const repeated = state.lastAction === "study";
      const delta = getActionDelta("study");
      change(delta);
      if (repeated) {
        const clue = unlockClue("overwork");
        return withClueNotice(
          "你把整段时间都压进作品里。" + explainDelta(delta) + " 胸口像被塞进更多纸团。",
          clue
        );
      }
      return "你把注意力收回到作品上，完成了一块关键内容。" + explainDelta(delta);
    },
  },
  {
    id: "rest",
    name: "休息",
    desc: "压力 -25，专注 +5。压力过高时才休息会损失下一格时间。",
    scene: "bedroom",
    apply() {
      const late = state.stats.stress >= 80 && state.timeIndex < times.length - 1;
      const delta = getActionDelta("rest");
      change(delta);
      const clue = unlockClue("earlyRest");
      if (late) {
        state.skipNext = true;
        return withClueNotice(
          "你终于闭上眼，却睡过了头。" + explainDelta(delta) + " 但下一段时间从指缝里滑走了。",
          clue
        );
      }
      return withClueNotice("你离开桌面，喝水、伸展、让脑子从噪声里退出来。" + explainDelta(delta), clue);
    },
  },
  {
    id: "friend",
    name: "找朋友聊天",
    desc: "提升关系并降低压力。中午选择会触发天台线索。",
    scene: "rooftop",
    apply() {
      const delta = getActionDelta("friend");
      change(delta);
      state.socialTriggered = true;
      if (times[state.timeIndex] === "中午") {
        const first = unlockClue("friendAtNoon");
        const second = unlockClue("askHelp");
        return withClueNotice(
          "你在天台遇到朋友。对方说：你不是只能一个人扛着，老师其实愿意看半成品。" + explainDelta(delta),
          first || second
        );
      }
      return "你回了朋友的消息。只是几句话，今天忽然没那么像一条封闭走廊。" + explainDelta(delta);
    },
  },
  {
    id: "hobby",
    name: "做兴趣活动",
    desc: "自我认同 +30，压力 -10。短期不加进度，但影响结局。",
    scene: "hobby",
    apply() {
      const delta = getActionDelta("hobby");
      change(delta);
      const clue = unlockClue("interest");
      return withClueNotice(
        "你画了几笔和作品无关的东西。它没有让待办变少，却让你重新想起自己不是一张进度表。" + explainDelta(delta),
        clue
      );
    },
  },
  {
    id: "help",
    name: "向老师 / 学长求助",
    desc: "关系达到 50 或获得求助线索后可用。能稳定推进关键进度。",
    scene: "office",
    apply() {
      const delta = getActionDelta("help");
      change(delta);
      const clue = unlockClue("askHelp");
      state.helpTriggered = true;
      return withClueNotice(
        "你发出半成品和问题。回复没有责备，只有一句：先把最核心的部分保住。" + explainDelta(delta),
        clue
      );
    },
  },
];

const goalDefs = [
  { id: "progress", text: "完成作品：任务进度达到 80", done: () => state.stats.progress >= 80 },
  { id: "stress", text: "一天结束时压力低于 90", done: () => state.ended && state.stats.stress < 90 },
  { id: "self", text: "不把自己丢掉：自我认同达到 50", done: () => state.stats.self >= 50 },
  { id: "connection", text: "学会连接：找朋友或成功求助一次", done: () => state.socialTriggered || state.helpTriggered || state.clues.has("askHelp") },
  { id: "variety", text: "灵活安排：一天内尝试至少 4 种行动", done: () => getUniqueActionCount() >= 4 },
];

const achievementDefs = [
  { id: "study", text: "第一次赶工" },
  { id: "rest", text: "第一次主动休息" },
  { id: "friend", text: "第一次找朋友说出口" },
  { id: "help", text: "第一次成功求助" },
  { id: "noonFriend", text: "天台相遇：中午去找朋友" },
  { id: "variety", text: "平衡排程：一天尝试 4 种行动" },
  { id: "good", text: "抵达好结局：不是满分的一天" },
];

const endingDefs = [
  { id: "overload", title: "过载失败" },
  { id: "unfinished", title: "目标未完成" },
  { id: "empty", title: "空心完成" },
  { id: "almost", title: "差一点的一天" },
  { id: "good", title: "不是满分的一天" },
];

const randomEvents = [
  { text: "走廊里突然安静下来，你多挤出一点专注。专注 +5。", delta: { focus: 5 } },
  { text: "群聊消息刷屏打断了思路。专注 -5，压力 +2。", delta: { focus: -5, stress: 2 } },
  { text: "朋友发来一句“别忘了喝水”。关系 +5，压力 -3。", delta: { relation: 5, stress: -3 } },
  { text: "灵感突然接上了半截。任务进度 +5。", delta: { progress: 5 } },
  { text: "身体有点发沉，今天比想象中更累。压力 +3。", delta: { stress: 3 } },
  { text: "你忽然想起作品最初想表达什么。自我认同 +5。", delta: { self: 5 } },
];

const state = {
  stats: { ...initialStats },
  timeIndex: 0,
  loop: 1,
  clues: new Set(),
  lastAction: null,
  skipNext: false,
  socialTriggered: false,
  helpTriggered: false,
  ended: false,
  actionHistory: [],
  achievements: new Set(),
  completedGoals: new Set(),
  seenEndings: new Set(),
  currentEvent: null,
  strategy: null,
  lastReview: null,
  nextReminder: null,
};

const el = {
  timeLabel: document.getElementById("timeLabel"),
  sceneTitle: document.getElementById("sceneTitle"),
  sceneText: document.getElementById("sceneText"),
  storyText: document.getElementById("storyText"),
  eventCard: document.getElementById("eventCard"),
  eventTitle: document.getElementById("eventTitle"),
  eventText: document.getElementById("eventText"),
  sceneSky: document.getElementById("sceneSky"),
  timeline: document.getElementById("timeline"),
  loopCount: document.getElementById("loopCount"),
  actions: document.getElementById("actions"),
  goalList: document.getElementById("goalList"),
  achievementList: document.getElementById("achievementList"),
  endingList: document.getElementById("endingList"),
  clueList: document.getElementById("clueList"),
  statusTags: document.getElementById("statusTags"),
  strategyLabel: document.getElementById("strategyLabel"),
  strategyOptions: document.getElementById("strategyOptions"),
  resultBox: document.getElementById("resultBox"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  submitCard: document.getElementById("submitCard"),
  submitList: document.getElementById("submitList"),
  reviewCard: document.getElementById("reviewCard"),
  reviewTitle: document.getElementById("reviewTitle"),
  reviewList: document.getElementById("reviewList"),
  roundSummary: document.getElementById("roundSummary"),
  nextReminder: document.getElementById("nextReminder"),
  restartButton: document.getElementById("restartButton"),
  manualOverlay: document.getElementById("manualOverlay"),
  manualButton: document.getElementById("manualButton"),
  manualClose: document.getElementById("manualClose"),
  routeOverlay: document.getElementById("routeOverlay"),
  routeButton: document.getElementById("routeButton"),
  routeClose: document.getElementById("routeClose"),
  values: {
    stress: document.getElementById("stressValue"),
    focus: document.getElementById("focusValue"),
    relation: document.getElementById("relationValue"),
    self: document.getElementById("selfValue"),
    progress: document.getElementById("progressValue"),
  },
  bars: {
    stress: document.getElementById("stressBar"),
    focus: document.getElementById("focusBar"),
    relation: document.getElementById("relationBar"),
    self: document.getElementById("selfBar"),
    progress: document.getElementById("progressBar"),
  },
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function change(delta) {
  Object.entries(delta).forEach(([key, value]) => {
    state.stats[key] = clamp(state.stats[key] + value);
  });
}

function unlockClue(id) {
  if (state.clues.has(id)) return null;
  state.clues.add(id);
  return clueTexts[id];
}

function withClueNotice(story, clueText) {
  return clueText ? story + " 新增便签：" + clueText : story;
}

function canUseHelp() {
  return state.stats.relation >= 50 || state.clues.has("askHelp");
}

function getUniqueActionCount() {
  return new Set(state.actionHistory.filter(Boolean).map((action) => action.id)).size;
}

function getBalanceScore() {
  let score = 0;
  score += Math.min(30, Math.round(state.stats.progress * 0.3));
  score += Math.max(0, 25 - Math.max(0, state.stats.stress - 40));
  score += Math.min(20, Math.round(state.stats.self * 0.2));
  score += state.socialTriggered || state.helpTriggered || state.clues.has("askHelp") ? 15 : 0;
  score += Math.min(10, getUniqueActionCount() * 2);
  return clamp(score);
}

function getEndingAdvice(type) {
  const advice = {
    overload: {
      focus: "压力在临界点前就要降下来。下一轮优先选“稳住节奏”，并把休息放在压力 80 之前。",
      reminder: "上一轮压力爆表。先稳住节奏，别连续赶工。",
    },
    unfinished: {
      focus: "作品推进不够。下一轮可以早一点求助，或用“冲刺提交”补足关键进度。",
      reminder: "上一轮进度没到 80。先规划一次高收益推进。",
    },
    empty: {
      focus: "任务完成了，但自我认同不足。下一轮至少留一格给兴趣活动。",
      reminder: "上一轮把自己丢掉了。记得安排兴趣活动。",
    },
    almost: {
      focus: "整体已经接近成功。下一轮补上连接：找朋友或求助，让今天不只靠硬扛。",
      reminder: "上一轮差在连接。中午找朋友或尽早求助。",
    },
    good: {
      focus: "你已经打通核心闭环。可以继续尝试更低压力或更高平衡评分的路线。",
      reminder: "好结局已达成。挑战更稳的评分路线。",
    },
  };
  return advice[type];
}

function getActionPathText() {
  if (state.actionHistory.length === 0) return "没有留下行动轨迹。";
  return state.actionHistory
    .filter(Boolean)
    .map((action) => action.time + "-" + action.name.replace(" / ", "/"))
    .join(" → ");
}

function getRoundReview(type) {
  const advice = getEndingAdvice(type);
  const weakPoints = [];
  if (state.stats.progress < 80) weakPoints.push("任务进度差 " + (80 - state.stats.progress) + " 点");
  if (state.stats.self < 50) weakPoints.push("自我认同差 " + (50 - state.stats.self) + " 点");
  if (state.stats.stress >= 90) weakPoints.push("最终压力过高");
  if (!(state.socialTriggered || state.helpTriggered || state.clues.has("askHelp"))) weakPoints.push("没有建立连接");

  return {
    type,
    title: type === "good" ? "这轮打通了核心闭环" : "这轮失败可以被利用",
    reminder: advice.reminder,
    items: [
      "行动轨迹：" + getActionPathText(),
      "最终状态：进度 " + state.stats.progress + "，压力 " + state.stats.stress + "，自我认同 " + state.stats.self + "，平衡评分 " + getBalanceScore() + " / 100。",
      "关键缺口：" + (weakPoints.length ? weakPoints.join("、") : "核心目标已补齐"),
      "下一轮建议：" + advice.focus,
    ],
  };
}

function hasStrategy(id) {
  return state.strategy === id;
}

function getActionDelta(actionId) {
  const deltaMap = {
    study: { progress: 25, focus: 15, stress: state.lastAction === "study" ? 35 : 20 },
    rest: { stress: -25, focus: 5 },
    friend: { relation: 20, stress: -10 },
    hobby: { self: 30, stress: -10 },
    help: { progress: 30, stress: -10, relation: 5 },
  };
  const delta = { ...deltaMap[actionId] };

  if (actionId === "study") {
    if (state.stats.focus >= 70) delta.progress += 10;
    if (state.stats.focus < 35) delta.progress -= 10;
    if (hasStrategy("steady")) delta.stress -= 5;
    if (hasStrategy("sprint")) {
      delta.progress += 10;
      delta.stress += 8;
    }
  }

  if (actionId === "rest" && hasStrategy("steady")) delta.stress -= 10;
  if (actionId === "friend" && hasStrategy("connect")) delta.relation += 10;
  if (actionId === "help") {
    if (state.stats.relation >= 70) delta.progress += 5;
    if (hasStrategy("sprint")) delta.progress += 10;
    if (hasStrategy("connect")) delta.progress += 5;
  }

  return delta;
}

function explainDelta(delta) {
  const labels = {
    stress: "压力",
    focus: "专注",
    relation: "关系",
    self: "自我认同",
    progress: "任务进度",
  };
  const parts = Object.entries(delta)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => labels[key] + " " + (value > 0 ? "+" : "") + value);
  return parts.length ? "（" + parts.join("，") + "）" : "";
}

function formatDelta(delta) {
  return explainDelta(delta).replace(/^（|）$/g, "") || "无变化";
}

function getStatusTags() {
  const tags = [];
  if (state.stats.stress >= 80) tags.push({ type: "danger", text: "压力临界：休息会跳过下一格" });
  else if (state.stats.stress >= 65) tags.push({ type: "warn", text: "压力偏高：建议安排恢复" });
  else tags.push({ type: "good", text: "压力可控" });

  if (state.stats.focus >= 70) tags.push({ type: "good", text: "专注充足：学习额外 +10 进度" });
  if (state.stats.focus < 35) tags.push({ type: "warn", text: "专注低迷：学习进度 -10" });
  if (canUseHelp()) tags.push({ type: "good", text: "求助已可用" });
  if (state.stats.self < 50) tags.push({ type: "warn", text: "自我认同不足：谨防空心完成" });
  return tags;
}

function unlockAchievement(id) {
  state.achievements.add(id);
}

function updateGoals() {
  const newlyCompleted = [];
  goalDefs.forEach((goal) => {
    if (goal.done() && !state.completedGoals.has(goal.id)) {
      state.completedGoals.add(goal.id);
      newlyCompleted.push(goal.text);
    }
  });
  return newlyCompleted;
}

function resetCompletedGoals() {
  state.completedGoals = new Set(goalDefs.filter((goal) => goal.done()).map((goal) => goal.id));
}

function applyRandomEvent() {
  if (Math.random() > 0.35) {
    state.currentEvent = null;
    return "";
  }

  const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
  change(event.delta);
  state.currentEvent = event;
  return event.text;
}

function render() {
  const currentTime = times[state.timeIndex] || "夜晚";
  el.timeLabel.textContent = currentTime;
  el.loopCount.textContent = "第 " + state.loop + " 次循环";

  Object.entries(state.stats).forEach(([key, value]) => {
    el.values[key].textContent = value;
    el.bars[key].style.width = value + "%";
  });

  renderTimeline();
  renderGoals();
  renderEvent();
  renderStatusTags();
  renderStrategies();
  renderActions();
  renderAchievements();
  renderEndings();
  renderClues();
  renderNextReminder();
  updateSky(currentTime);
}

function renderNextReminder() {
  if (!el.nextReminder) return;
  el.nextReminder.textContent = state.nextReminder || "还没有上一轮提醒。先走完今天，重启后会留下下一步建议。";
  el.nextReminder.classList.toggle("active", Boolean(state.nextReminder));
}

function renderStatusTags() {
  el.statusTags.innerHTML = "";
  getStatusTags().forEach((tag) => {
    const item = document.createElement("span");
    item.className = "status-tag " + tag.type;
    item.textContent = tag.text;
    el.statusTags.appendChild(item);
  });
}

function renderStrategies() {
  const selected = strategyDefs.find((strategy) => strategy.id === state.strategy);
  el.strategyLabel.textContent = selected ? selected.name : "未选择";
  el.strategyOptions.innerHTML = "";

  strategyDefs.forEach((strategy) => {
    const button = document.createElement("button");
    button.className = "strategy-button";
    if (state.strategy === strategy.id) button.classList.add("selected");
    button.disabled = state.ended || state.timeIndex > 0 || Boolean(state.strategy);
    button.innerHTML = "<strong>" + strategy.name + "</strong><span>" + strategy.desc + "</span>";
    button.addEventListener("click", () => chooseStrategy(strategy.id));
    el.strategyOptions.appendChild(button);
  });
}

function renderTimeline() {
  el.timeline.innerHTML = "";
  times.forEach((time, index) => {
    const item = document.createElement("li");
    const action = state.actionHistory[index];
    item.textContent = action ? time + "\n" + action.name.replace(" / ", "/") : time;
    if (index < state.timeIndex) item.classList.add("done");
    if (index === state.timeIndex && !state.ended) item.classList.add("current");
    el.timeline.appendChild(item);
  });
}

function renderGoals() {
  el.goalList.innerHTML = "";
  goalDefs.forEach((goal) => {
    const item = document.createElement("li");
    const done = goal.done();
    item.className = done ? "done" : "missing";
    item.innerHTML = `<strong>${done ? "✓" : "✗"}</strong> ${goal.text}`;
    el.goalList.appendChild(item);
  });
}

function renderEvent() {
  if (!state.currentEvent) {
    el.eventCard.classList.add("hidden");
    return;
  }

  el.eventTitle.textContent = "一个小变化改变了今天";
  el.eventText.textContent = state.currentEvent.text;
  el.eventCard.classList.remove("hidden");
}

function renderAchievements() {
  el.achievementList.innerHTML = "";
  achievementDefs.forEach((achievement) => {
    const item = document.createElement("li");
    const done = state.achievements.has(achievement.id);
    item.className = done ? "done" : "locked";
    item.textContent = (done ? "已解锁" : "未解锁") + "：" + achievement.text;
    el.achievementList.appendChild(item);
  });
}

function renderEndings() {
  el.endingList.innerHTML = "";
  endingDefs.forEach((ending) => {
    const item = document.createElement("li");
    const seen = state.seenEndings.has(ending.id);
    item.className = seen ? "seen" : "locked";
    item.textContent = (seen ? "已发现" : "未发现") + "：" + ending.title;
    el.endingList.appendChild(item);
  });
}

function renderActions() {
  el.actions.innerHTML = "";
  actions.forEach((action) => {
    const lockedHelp = action.id === "help" && !canUseHelp();
    const button = document.createElement("button");
    const desc = lockedHelp
      ? "暂时无法求助：先找朋友聊天，把关系提高到 50，或获得求助线索。"
      : action.desc + " 本次预估：" + formatDelta(getActionDelta(action.id));

    button.className = "action-button";
    if (lockedHelp) button.classList.add("locked");
    button.innerHTML = "<strong>" + action.name + "</strong><span>" + desc + "</span>";
    button.disabled = state.ended || lockedHelp;
    button.addEventListener("click", () => chooseAction(action));
    el.actions.appendChild(button);
  });
}

function chooseStrategy(strategyId) {
  if (state.ended || state.timeIndex > 0 || state.strategy) return;
  state.strategy = strategyId;
  const selected = strategyDefs.find((strategy) => strategy.id === strategyId);
  setScene("bedroom", "你在便签上写下今天的打法：" + selected.name + "。接下来每个选择都会受到它影响。");
  render();
}

function renderClues() {
  el.clueList.innerHTML = "";
  if (state.clues.size === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-clue";
    empty.textContent = "还没有便签。失败不会清空今天，它会留下新的记忆。";
    el.clueList.appendChild(empty);
    return;
  }

  Array.from(state.clues).forEach((id, index) => {
    const item = document.createElement("li");
    const meta = clueMeta[id] || { group: "线索", label: "新发现" };
    item.innerHTML = `<span class="clue-type">${meta.group}</span><strong>便签 ${String(index + 1).padStart(2, "0")} · ${meta.label}：</strong>${clueTexts[id]}`;
    el.clueList.appendChild(item);
  });
}

function updateSky(time) {
  el.sceneSky.className = "scene-sky";
  if (time === "中午" || time === "下午") el.sceneSky.classList.add("noon");
  if (time === "傍晚") el.sceneSky.classList.add("evening");
  if (time === "夜晚") el.sceneSky.classList.add("night");
}

function setScene(sceneId, story) {
  const scene = scenes[sceneId];
  el.sceneTitle.textContent = scene.title;
  el.sceneText.textContent = scene.text;
  el.storyText.textContent = story;
}

function chooseAction(action) {
  if (state.ended) return;

  if (action.id === "help" && !canUseHelp()) {
    setScene(action.scene, "你盯着输入框很久，最后还是删掉了那句开头。你还不知道该怎么开口。");
    render();
    return;
  }

  const previousTime = state.timeIndex;
  let story = action.apply();

  if (action.id === "study") unlockAchievement("study");
  if (action.id === "rest") unlockAchievement("rest");
  if (action.id === "friend") {
    unlockAchievement("friend");
    if (times[state.timeIndex] === "中午") unlockAchievement("noonFriend");
  }
  if (action.id === "help") unlockAchievement("help");
  if (new Set([...state.actionHistory.filter(Boolean).map((item) => item.id), action.id]).size >= 4) {
    unlockAchievement("variety");
  }

  const randomStory = applyRandomEvent();
  const completedGoals = updateGoals();
  if (randomStory) story = story + " 今日插曲：" + randomStory;
  if (completedGoals.length > 0) story = story + " 目标达成：" + completedGoals.join("、") + "。";

  setScene(action.scene, story);
  state.actionHistory[previousTime] = { id: action.id, name: action.name, time: times[previousTime] };
  state.lastAction = action.id;

  if (state.stats.stress >= 100) {
    const clue = unlockClue("overwork");
    if (clue) el.storyText.textContent += " 新增便签：" + clue;
    endDay("overload");
    return;
  }

  state.timeIndex += state.skipNext ? 2 : 1;
  state.skipNext = false;

  if (state.timeIndex >= times.length) {
    judgeEnding();
    return;
  }

  render();
}

function judgeEnding() {
  if (state.stats.progress < 80) {
    endDay("unfinished");
    return;
  }

  if (state.stats.self < 50) {
    endDay("empty");
    return;
  }

  if (
    state.stats.stress < 90 &&
    (state.socialTriggered || state.helpTriggered || state.clues.has("askHelp"))
  ) {
    unlockAchievement("good");
    endDay("good");
    return;
  }

  endDay("almost");
}

function endDay(type) {
  state.ended = true;
  state.seenEndings.add(type);
  updateGoals();
  state.lastReview = getRoundReview(type);
  state.nextReminder = state.lastReview.reminder;

  const endings = {
    overload: {
      title: "过载失败",
      text: "你明明一直在努力，为什么还是走不下去？闹钟声倒转，今天重新开始，但你记住了：硬撑不是唯一答案。",
    },
    unfinished: {
      title: "目标未完成",
      text: "夜晚过去，作品仍停在关键部分之前。也许今天不能只靠等待状态变好，需要更早做出取舍。",
    },
    empty: {
      title: "空心完成",
      text: "作品交上去了，但你几乎想不起这一天除了赶工还剩下什么。今天可以重来一次，试着别把自己丢掉。",
    },
    almost: {
      title: "差一点的一天",
      text: "你保住了作品，也没有彻底崩溃。但某些重要的连接还没发生，今天仍然可以更完整。",
    },
    good: {
      title: "不是满分的一天",
      text: "我没有把今天变成完美的一天。但我完成了该完成的，也没有再把自己丢掉。",
    },
  };

  el.resultTitle.textContent = endings[type].title;
  el.resultText.textContent = endings[type].text;
  renderSubmitCard(type);
  renderReviewCard();
  renderRoundSummary(type);
  el.resultBox.classList.remove("hidden");
  el.actions.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  render();
}

function renderReviewCard() {
  if (!state.lastReview) {
    el.reviewCard.classList.add("hidden");
    return;
  }

  el.reviewCard.classList.remove("hidden");
  el.reviewTitle.textContent = state.lastReview.title;
  el.reviewList.innerHTML = "";
  state.lastReview.items.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    el.reviewList.appendChild(item);
  });
}

function renderSubmitCard(type) {
  el.submitList.innerHTML = "";
  el.submitCard.classList.toggle("hidden", type !== "good");
  if (type !== "good") return;

  [
    "作品完成度：" + state.stats.progress,
    "最终压力值：" + state.stats.stress,
    "自我认同：" + state.stats.self,
    "今日策略：" + (strategyDefs.find((strategy) => strategy.id === state.strategy)?.name || "临场调整"),
    "平衡评分：" + getBalanceScore() + " / 100",
    "保留下来的选择：求助、休息和继续完成作品",
  ].forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    el.submitList.appendChild(item);
  });
}

function renderRoundSummary(type) {
  el.roundSummary.innerHTML = "";
  goalDefs.forEach((goal) => {
    const item = document.createElement("li");
    const done = goal.done();
    item.className = done ? "done" : "missing";
    item.textContent = (done ? "完成" : "未完成") + "：" + goal.text;
    el.roundSummary.appendChild(item);
  });

  const hint = document.createElement("li");
  hint.className = type === "good" ? "done" : "missing";
  hint.textContent = type === "good"
    ? "这一天不完美，但你完成了最重要的平衡。平衡评分：" + getBalanceScore() + " / 100。"
    : "下一轮试着补齐未完成的目标，而不是只追进度。";
  el.roundSummary.appendChild(hint);
}

function restartDay() {
  const savedClues = new Set(state.clues);
  const savedAchievements = new Set(state.achievements);
  const savedSeenEndings = new Set(state.seenEndings);
  const savedReminder = state.nextReminder;

  state.stats = { ...initialStats };
  state.timeIndex = 0;
  state.loop += 1;
  state.clues = savedClues;
  state.achievements = savedAchievements;
  state.seenEndings = savedSeenEndings;
  state.nextReminder = savedReminder;
  state.lastReview = null;
  state.lastAction = null;
  state.skipNext = false;
  state.socialTriggered = false;
  state.helpTriggered = false;
  state.ended = false;
  state.actionHistory = [];
  state.currentEvent = null;
  state.strategy = null;
  resetCompletedGoals();
  el.resultBox.classList.add("hidden");
  el.submitCard.classList.add("hidden");
  el.reviewCard.classList.add("hidden");
  setScene(
    "bedroom",
    "闹钟再次响起。奇怪的是，上一轮的感觉没有完全消失。" + (savedReminder ? "便签上写着：" + savedReminder : "你知道今天可以换一种过法。")
  );
  render();
}

function openManual() {
  el.manualOverlay.style.display = "flex";
  el.manualOverlay.classList.remove("hidden");
}

function closeManual() {
  el.manualOverlay.style.display = "none";
  el.manualOverlay.classList.add("hidden");
}

function openRoute() {
  el.routeOverlay.style.display = "flex";
  el.routeOverlay.classList.remove("hidden");
}

function closeRoute() {
  el.routeOverlay.style.display = "none";
  el.routeOverlay.classList.add("hidden");
}

function bindModal(overlay, closeButton, closeFn) {
  if (closeButton) {
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeFn();
    });
  }
  if (overlay) {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeFn();
    });
  }
}

let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  setScene("bedroom", "今天是最后准备时间。同学又发来一句：你还好吗？");
  resetCompletedGoals();
  render();
}

if (el.restartButton) el.restartButton.addEventListener("click", restartDay);
if (el.manualButton) el.manualButton.addEventListener("click", openManual);
if (el.routeButton) el.routeButton.addEventListener("click", openRoute);
bindModal(el.manualOverlay, el.manualClose, closeManual);
bindModal(el.routeOverlay, el.routeClose, closeRoute);

document.addEventListener("DOMContentLoaded", init);
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(init, 0);
}
