#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(__dirname, "..");
const referencesDir = path.join(skillDir, "references");
const apiBase = "https://service.flova.ai/api/v2";
const locale = process.argv[2] || "zh-CN";

function nowIso() {
  return new Date().toISOString();
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Client": "fetcher",
      "X-Lang": locale,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`API ${json.code}: ${json.message || "unknown"} for ${url}`);
  }
  return json.data;
}

async function listCategories() {
  return request(`${apiBase}/skill/categories`);
}

async function listPublicSkills() {
  const first = await request(
    `${apiBase}/skill/list_public_v2?page=1&page_size=100&locale=${encodeURIComponent(locale)}&only_brief=true`,
  );
  const total = Number(first.total || first.items?.length || 0);
  const pageSize = Number(first.page_size || 100);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const items = [...(first.items || [])];
  for (let page = 2; page <= pages; page += 1) {
    const data = await request(
      `${apiBase}/skill/list_public_v2?page=${page}&page_size=${pageSize}&locale=${encodeURIComponent(locale)}&only_brief=true`,
    );
    items.push(...(data.items || []));
  }
  return items;
}

async function getSkillDetail(skillId) {
  return request(`${apiBase}/skill/get`, {
    method: "POST",
    body: JSON.stringify({ skill_id: skillId }),
  });
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    for (;;) {
      const current = index;
      index += 1;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function sectionContent(skill) {
  if (!Array.isArray(skill.skill_content)) return [];
  return skill.skill_content.map((section) => ({
    section: section.section || "unknown",
    content: section.content || "",
  }));
}

function modelNames(skill) {
  return (skill.attrs?.model_tags || [])
    .map((tag) => tag.name || `${tag.resource_type || "model"}:${tag.model_type || ""}`)
    .filter(Boolean);
}

function categoryNames(skill, categoryMap) {
  return (skill.attrs?.category_ids || [])
    .map((id) => categoryMap.get(id)?.name || id)
    .filter(Boolean);
}

function frontMatterSafe(value) {
  return cleanText(value).replace(/\|/g, "\\|");
}

function renderMarkdown(catalog) {
  const categoryMap = new Map(catalog.categories.map((category) => [category.id, category]));
  const lines = [];
  lines.push("# Flova Official Public Skill Catalog");
  lines.push("");
  lines.push(`Fetched: ${catalog.fetched_at}`);
  lines.push(`Locale: ${catalog.locale}`);
  lines.push(`Source: ${catalog.sources.public_skills}`);
  lines.push(`Total public skills: ${catalog.skills.length}`);
  lines.push("");
  lines.push("## Categories");
  lines.push("");
  for (const category of catalog.categories) {
    lines.push(`- ${category.id}: ${category.name}${category.is_default ? " (default)" : ""}`);
  }
  lines.push("");
  lines.push("## Index");
  lines.push("");
  lines.push("| # | Skill | Categories | Models | Short Use | Detail Sections |");
  lines.push("|---:|---|---|---|---|---|");
  catalog.skills.forEach((skill, idx) => {
    const categories = categoryNames(skill, categoryMap).join(", ");
    const models = modelNames(skill).join(", ");
    const sections = sectionContent(skill).map((section) => section.section).join(", ");
    const shortUse = cleanText(skill.description || skill.skill_description).slice(0, 180);
    lines.push(
      `| ${idx + 1} | ${frontMatterSafe(skill.skill_name)} | ${frontMatterSafe(categories)} | ${frontMatterSafe(models)} | ${frontMatterSafe(shortUse)} | ${frontMatterSafe(sections)} |`,
    );
  });
  lines.push("");
  lines.push("## Detail Notes");
  lines.push("");
  lines.push("Use `official-skill-catalog.json` for exact full official section text. The notes below are compressed from the official detail API.");
  lines.push("");
  catalog.skills.forEach((skill, idx) => {
    lines.push(`### ${idx + 1}. ${skill.skill_name}`);
    lines.push("");
    lines.push(`- id: \`${skill.skill_id}\``);
    lines.push(`- categories: ${categoryNames(skill, categoryMap).join(", ") || "unknown"}`);
    lines.push(`- models: ${modelNames(skill).join(", ") || "unknown"}`);
    lines.push(`- description: ${cleanText(skill.description) || "none"}`);
    lines.push(`- skill_description: ${cleanText(skill.skill_description) || "none"}`);
    const sections = sectionContent(skill);
    if (sections.length) {
      lines.push("- sections:");
      for (const section of sections) {
        lines.push(`  - ${section.section}: ${cleanText(section.content).slice(0, 260)}`);
      }
    } else {
      lines.push("- sections: none returned by detail API");
    }
    lines.push("");
  });
  return `${lines.join("\n")}\n`;
}

async function main() {
  await mkdir(referencesDir, { recursive: true });
  const [categories, publicItems] = await Promise.all([listCategories(), listPublicSkills()]);
  const details = await mapLimit(publicItems, 5, async (item, idx) => {
    process.stderr.write(`Fetching ${idx + 1}/${publicItems.length}: ${item.skill_name}\n`);
    const detail = await getSkillDetail(item.skill_id);
    return { ...item, ...detail };
  });
  const catalog = {
    fetched_at: nowIso(),
    locale,
    sources: {
      public_skills: "https://www.flova.ai/zh-CN/skill/",
      docs_understanding: "https://www.flova.ai/docs/zh-CN/introduction/understanding-flova",
      api_base: apiBase,
    },
    categories,
    skills: details,
  };
  await writeFile(
    path.join(referencesDir, "official-skill-catalog.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
  );
  await writeFile(path.join(referencesDir, "official-skill-catalog.md"), renderMarkdown(catalog));
  console.log(`Wrote ${catalog.skills.length} skills to ${referencesDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
