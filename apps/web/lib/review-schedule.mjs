export function getReviewSchedulePolicy() {
  return {
    recommendedMode: '三段式审核',
    dailyBatchTime: '20:00',
    requiredApprovals: 2,
    publishRule: '至少 2 个同事 Codex 审核通过，且没有敏感信息标记，才进入可发布资产库。',
    triggers: [
      {
        id: 'upload-precheck',
        name: '上传即初审',
        when: '上传后立刻执行',
        executor: '投稿人的 Codex 或网站后端',
        purpose: '检查字段是否完整、是否明显包含账号密码 token 客户信息或私有路径。',
        result: '通过后进入共享投稿池；有明显风险则标记为需补充或敏感拦截。',
      },
      {
        id: 'daily-cross-review',
        name: '晚间批量交叉审核',
        when: '每天 20:00 自动执行',
        executor: '运营部 2 个以上同事 Codex',
        purpose: '从岗位匹配、任务匹配、可复用性、安装边界和敏感信息角度做正式交叉审核。',
        result: '达到发布条件后转入已审核资产；不通过则退回投稿池补充。',
      },
      {
        id: 'install-time-review',
        name: '使用前补审',
        when: '同事准备安装或复用前，如果审核不足则执行',
        executor: '调用者的 Codex 加 1 个同事 Codex',
        purpose: '避免未审核资产被直接安装到本地 Codex。',
        result: '补齐审核后再允许安装；仍不足时只展示投稿摘要，不给安装动作。',
      },
    ],
  };
}
