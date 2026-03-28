import { defineConfig } from 'vitepress';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootPkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../../package.json'), 'utf-8'),
);
const APP_VERSION = rootPkg.version as string;

const SITE_URL = 'https://app.aqbot.top';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default defineConfig({
  title: 'AQBot',
  description: 'AQBot — Open-source AI desktop client with built-in AI gateway, multi-model chat, MCP server support. Connect OpenAI, Claude, Gemini and more LLMs in one app.',

  base: '/',

  lastUpdated: true,
  cleanUrls: true,

  sitemap: {
    hostname: SITE_URL,
  },

  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
  },

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    // Primary SEO meta
    ['meta', { name: 'theme-color', content: '#309731' }],
    ['meta', { name: 'author', content: 'AQBot Team' }],
    ['meta', { name: 'keywords', content: 'AQBot, AI desktop client, AI gateway, AI chat client, LLM client, multi-model AI, MCP server, OpenAI client, Claude client, Gemini client, AI assistant, desktop AI app, open source AI, ChatGPT alternative, AI aggregator, large language model, AI desktop application, Tauri AI app' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'AQBot' }],
    ['meta', { property: 'og:title', content: 'AQBot — Open-source AI Desktop Client & Gateway' }],
    ['meta', { property: 'og:description', content: 'Free, open-source AI desktop client with built-in gateway. Connect multiple LLMs (OpenAI, Claude, Gemini, DeepSeek) in one app. MCP server support, knowledge base, and more.' }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:locale:alternate', content: 'zh_CN' }],
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'AQBot — Open-source AI Desktop Client & Gateway' }],
    ['meta', { name: 'twitter:description', content: 'Free, open-source AI desktop client with built-in gateway. Multi-model chat, MCP server support, knowledge base.' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
  ],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      title: 'AQBot',
      description: 'AQBot — Open-source AI desktop client with built-in AI gateway, multi-model chat, MCP server support.',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Features', link: '/features' },
          { text: 'Download', link: '/download' },
          { text: 'Docs', link: '/guide/getting-started' },
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Quick Start', link: '/guide/getting-started' },
                { text: 'Configure Providers', link: '/guide/providers' },
                { text: 'MCP Servers', link: '/guide/mcp' },
                { text: 'API Gateway', link: '/guide/gateway' },
              ],
            },
          ],
        },
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'AQBot',
      description: 'AQBot — 开源 AI 桌面客户端，内置 AI 网关，支持多模型对话、MCP 服务器、知识库。连接 OpenAI、Claude、Gemini、DeepSeek 等大语言模型。',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '功能', link: '/zh/features' },
          { text: '下载', link: '/zh/download' },
          { text: '文档', link: '/zh/guide/getting-started' },
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '入门',
              items: [
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '配置服务商', link: '/zh/guide/providers' },
                { text: 'MCP 服务器', link: '/zh/guide/mcp' },
                { text: 'API 网关', link: '/zh/guide/gateway' },
              ],
            },
          ],
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        darkModeSwitchLabel: '外观',
        returnToTopLabel: '返回顶部',
        sidebarMenuLabel: '菜单',
        outline: { label: '页面导航' },
      },
    },
  },

  themeConfig: {
    logo: '/logo.png',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/AQBot-Desktop/AQBot' },
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '重置搜索',
                noResultsText: '没有结果',
                footer: { selectText: '选择', navigateText: '导航', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
  },
});
