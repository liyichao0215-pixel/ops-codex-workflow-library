export function getLaunchReadinessChecklist() {
  const items = [
    {
      id: 'shared-url',
      title: '同事能访问同一个测试站',
      status: '待验证',
      owner: '你 + 1 位同事',
      check: '把网站部署到一个内部测试 URL，同事用自己的电脑和飞书账号打开。',
      pass: '同事能登录、能看到共享投稿池和已审核资产。',
    },
    {
      id: 'submission-sync',
      title: '投稿同步验证',
      status: '待验证',
      owner: '2 位运营同事',
      check: 'A 同事上传一个 skill 或工具，B 同事刷新投稿池。',
      pass: 'B 同事能在 2 分钟内看到 A 的投稿。',
    },
    {
      id: 'codex-search-install',
      title: 'Codex 搜索与安装验证',
      status: '待验证',
      owner: '2 位岗位不同的同事',
      check: '同事只说岗位和问题，让 Codex 自动筛选、解释匹配原因，并安装或给出复用步骤。',
      pass: '同事不浏览列表也能找到可用资产。',
    },
    {
      id: 'cross-review',
      title: '交叉审核验证',
      status: '待验证',
      owner: '2 个同事 Codex',
      check: '对同一条投稿跑 2 次交叉审核，检查敏感信息、适用岗位、可安装性和人工边界。',
      pass: '审核结果能阻止敏感或不完整投稿直接发布。',
    },
    {
      id: 'permission-boundary',
      title: '权限边界验证',
      status: '待验证',
      owner: '你 + 管理员',
      check: '未登录、非运营成员、普通运营成员分别访问网站和 API。',
      pass: '未授权用户不能看到内部资产和原始投稿内容。',
    },
    {
      id: 'operation-dry-run',
      title: '完整工作流试跑',
      status: '待验证',
      owner: '你 + 2 位同事',
      check: '用 3 个真实资产完成一次投稿、一次搜索、一次审核、一次本地安装或复用。',
      pass: '同事不需要你手把手解释，也能跑完核心流程。',
    },
  ];

  return {
    purpose: '内部同事联调验证',
    currentAccess: {
      status: '本地演示',
      message: '当前本地演示地址只代表开发者电脑，同事不能用自己的本地地址看到同一份网站。要和同事验证，需要先部署一个内部测试 URL，并接同一份共享数据。',
    },
    items,
  };
}

export function summarizeLaunchReadiness(items = []) {
  const total = items.length;
  const done = items.filter((item) => item.status === '已通过').length;
  const remaining = total - done;

  return {
    total,
    done,
    remaining,
    label: remaining === 0 ? '内部联调已跑通' : `${remaining} 项待验证`,
  };
}
