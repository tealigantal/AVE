const shortcuts = [
  ["Space", "在时间线获得焦点时，或视频预览画面获得焦点时，播放或暂停当前预览。"],
  ["A", "时间线获得焦点时切回选择工具。"],
  ["← / →", "时间标尺或时间线视口获得焦点时，将播放头移动一帧。"],
  ["Ctrl + B", "在播放头分割当前选中的片段、字幕或文字；落点无效时不会提交。"],
  ["Delete", "时间线获得焦点时删除当前选中的片段、字幕、文字或转场。"],
  ["Ctrl + Z", "撤销最近一次时间线修改。"],
  ["Ctrl + Shift + Z", "重做已撤销的时间线修改。"],
];

function card(title, content) {
  const section = document.createElement("section");
  section.className = "workspace-help-card";
  const heading = document.createElement("h2");
  heading.textContent = title;
  section.append(heading, content);
  return section;
}

function bulletList(items) {
  const list = document.createElement("ul");
  for (const text of items) {
    const item = document.createElement("li");
    item.textContent = text;
    list.append(item);
  }
  return list;
}

function shortcutList() {
  const list = document.createElement("dl");
  list.className = "workspace-help-shortcuts";
  for (const [keys, description] of shortcuts) {
    const term = document.createElement("dt");
    term.textContent = keys;
    const detail = document.createElement("dd");
    detail.textContent = description;
    list.append(term, detail);
  }
  return list;
}

export function createHelpPage() {
  const page = document.createElement("section");
  page.className = "workspace-help-page";
  page.setAttribute("aria-labelledby", "workspace-help-title");

  const heading = document.createElement("header");
  heading.className = "workspace-page-heading";
  const title = document.createElement("h1");
  title.id = "workspace-help-title";
  title.textContent = "帮助与快捷操作";
  const description = document.createElement("p");
  description.className = "muted";
  description.textContent = "查看当前工作台支持的操作。快捷键只在时间线或播放器适用的位置生效。";
  heading.append(title, description);

  const grid = document.createElement("div");
  grid.className = "workspace-help-grid";
  grid.append(
    card("作品与素材", bulletList([
      "在作品管理中新建、打开或关闭本机作品；最近作品列表读取失败时会显示错误，不会当作空列表。",
      "在素材页导入视频、图片和音频。预览素材不会自动把它加入时间线；需要使用素材时，从素材面板将其放到目标位置。",
      "当前制作请求会在发送前单独确认可使用的素材和数据范围。",
    ])),
    card("精修时间线", bulletList([
      "点击时间标尺或拖动播放头定位；方向键在标尺或时间线视口聚焦时逐帧移动。",
      "拖动片段主体可移动，拖动边缘可修剪；右键菜单提供分割、复制到画中画、删除和添加批注等当前对象操作。",
      "时间线滚轮以指针位置缩放；Shift 加滚轮上下浏览轨道，Alt 加滚轮左右平移。轨道锁定、重叠及过期版本仍会拒绝无效修改。",
      "一次性整理多条批注后，可连同整体要求发送；处理成功后活动标记清除，历史锚点仍可跳回原位置。",
    ])),
    card("键盘快捷键", shortcutList()),
    card("版本、问题与导出", bulletList([
      "版本历史中的预览用于观看；采用版本会另行提交。比较、撤销和重做均保留当前项目身份与版本检查。",
      "问题与恢复保留可查询的操作根因；关闭短暂提示不会删除问题记录。",
      "导出前选择一个已完成的固定版本并查看检查结果。保存取消不会生成成功回执；可用附件按独立入口保存。",
      "输入框、字幕编辑和 IME 组合输入拥有键盘焦点时，工作台快捷键不会抢走输入。",
    ])),
  );

  page.append(heading, grid);
  return page;
}
