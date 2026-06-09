export function getSystemBlueprint() {
  return {
    name: '公司运营 Codex 工作流资产库',
    mode: 'Codex-first internal platform',
    layers: [
      {
        name: '前端',
        responsibilities: [
          'Codex-first 资产筛选工作台',
          '内部成员登录入口',
          '资产详情、安装提示、投稿提示、交叉审核提示复制',
          '展示前端/后端/数据库虚拟环境状态',
        ],
        files: ['index.html', 'styles.css', 'app.mjs'],
      },
      {
        name: '后端',
        responsibilities: [
          '提供 Codex 可读 API',
          '读取和写入虚拟 JSON 数据库',
          '生成 catalog、安装提示、交叉审核提示',
          '接收 Codex 投稿和同事 Codex 交叉审核',
        ],
        endpoints: [
          'GET /api/bootstrap',
          'GET /api/catalog',
          'GET /api/assets',
          'GET /api/reviews?assetId=...',
          'POST /api/reviews',
          'POST /api/submissions',
        ],
      },
      {
        name: '数据库',
        responsibilities: [
          '保存资产、投稿、同事 Codex 审核、安装记录和审计日志',
          '保留飞书字段映射，后续替换为飞书多维表格或正式数据库',
        ],
        entities: ['assets', 'crossReviews', 'submissions', 'installEvents', 'auditLog', 'feishuFieldMap'],
      },
    ],
  };
}
