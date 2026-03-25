# 对话压缩技术调研文档

> AQBot 长对话上下文管理方案调研
> 更新日期：2025-03

---

## 一、问题背景

当对话轮次增多时，发送给 LLM 的上下文（历史消息 + 系统提示 + 用户输入）会逐步逼近甚至超出模型的 **context window** 上限。超限后模型要么截断历史导致"遗忘"，要么报错拒绝请求。

AQBot 作为本地桌面客户端，需要在 **客户端/网关层** 对发送给各厂商 API 的上下文做管理，核心目标：

1. 在 token 预算内保留尽可能多的有效信息
2. 避免用户感知到"对话断裂"或"AI 忘了之前说的"
3. 方案需兼容多模型（OpenAI / Claude / Gemini / 本地模型等）

---

## 二、业界主流方案概览

| 方案 | 原理 | 压缩比 | 信息保留度 | 实现复杂度 | 典型产品 |
|------|------|--------|-----------|-----------|---------|
| 滑动窗口 | 仅保留最近 N 轮 | 不固定 | ★★☆ | ★☆☆ | 多数客户端默认策略 |
| 摘要压缩 | LLM 生成历史摘要替换原文 | 5–20x | ★★★☆ | ★★☆ | ChatGPT、Claude |
| 混合缓冲（Summary+Buffer）| 近期原文 + 远期摘要 | 3–10x | ★★★★ | ★★★ | LangChain |
| RAG 检索增强 | 向量化历史消息，按相关性召回 | 极高 | ★★★☆ | ★★★★ | Mem0、自建 |
| 知识图谱记忆 | 提取实体关系构建 KG | 极高 | ★★★★ | ★★★★★ | LangChain KG Memory |
| 分层虚拟记忆 | 模拟 OS 内存分页管理 | 极高 | ★★★★★ | ★★★★★ | MemGPT/Letta |
| Token 级裁剪 | 删除低信息量 token | 2–20x | ★★★ | ★★★ | LLMLingua |

---

## 三、方案详细分析

### 3.1 滑动窗口（Sliding Window）

**原理：** 仅将最近 K 轮对话（或最近 N 个 token）作为上下文发送给 LLM，丢弃更早的消息。

**优点：**
- 实现最简单，无需额外 LLM 调用
- 延迟为零（不需要压缩计算）
- 效果在短对话中足够好

**缺点：**
- 一旦超出窗口，旧信息完全丢失
- 用户问"我之前说的 XXX"时无法回答
- 对任务型对话（如编程助手）影响较大

**适用场景：** 闲聊、一次性问答

**实现方式：**
```
messages = system_prompt + recent_messages[-K:]
```

---

### 3.2 摘要压缩（Summarization）

**原理：** 当对话历史超过阈值时，调用 LLM 将较早的历史消息压缩为一段摘要文本。后续请求携带 `摘要 + 近期原文` 作为上下文。

**优点：**
- 信息保留度远优于滑动窗口
- 用户感知较好（AI 仍能记住关键信息）
- 实现相对简单

**缺点：**
- 每次压缩需要额外一次 LLM 调用（成本 + 延迟）
- 多轮递归压缩后信息衰减（摘要的摘要会丢失细节）
- 摘要质量依赖所用模型能力

**关键设计决策：**
- **触发时机：** token 达到阈值（如模型上限的 70%）时触发
- **压缩范围：** 通常保留最近 2-4 轮原文不压缩
- **递归策略：** 当摘要本身过长时，可对摘要再次压缩（递归摘要）
- **摘要 prompt 设计：** 需指示模型"保留关键事实、用户偏好、待办事项"

**ChatGPT 的实现：**
OpenAI 的 ChatGPT 使用分层记忆架构：
1. **Context Window（短期记忆）**：当前会话的完整消息
2. **持久化记忆（长期记忆）**：从对话中提取的用户偏好、个人事实，存入数据库，跨会话可用
3. **会话内压缩**：超出 context window 时自动对旧消息做摘要压缩

**实现参考：**
```python
# 伪代码 - 摘要压缩流程
def compress_history(messages, max_tokens, model):
    recent = messages[-4:]  # 保留最近 4 轮
    older = messages[:-4]
    
    if count_tokens(older) < threshold:
        return messages  # 无需压缩
    
    summary = llm.summarize(older, prompt="""
        请将以下对话历史压缩为简洁摘要，保留：
        1. 用户的核心需求和目标
        2. 已达成的关键决策
        3. 重要的技术细节和约束条件
        4. 待解决的问题
    """)
    
    return [system_msg, summary_msg, *recent]
```

---

### 3.3 混合缓冲（Summary + Buffer）

**原理：** LangChain 的 `ConversationSummaryBufferMemory` 策略。维护两部分：
- **Buffer（缓冲区）**：最近的对话原文，保留完整细节
- **Summary（摘要区）**：更早的对话被压缩为摘要

当 buffer 超出 `max_token_limit` 时，最老的消息从 buffer 移出并合并进 summary。

**优点：**
- 最佳的信息保留 vs token 效率平衡
- 近期上下文保留完整细节，远期仍有摘要覆盖
- 业界最成熟的方案，大量生产级实践

**缺点：**
- 需要维护 summary 状态
- 每次触发压缩有延迟

**LangChain 的 Memory 类型对比：**

| 类型 | 存储方式 | 适用场景 |
|------|---------|---------|
| `ConversationBufferMemory` | 全量原文 | 短对话 |
| `ConversationBufferWindowMemory` | 最近 K 轮原文 | 滑动窗口 |
| `ConversationSummaryMemory` | 仅存摘要 | 超长对话但可接受信息损失 |
| `ConversationSummaryBufferMemory` | 摘要 + 近期原文 | **推荐：长对话的最佳平衡** |
| `ConversationTokenBufferMemory` | 按 token 数截断 | 精确控制 token 预算 |
| `ConversationKGMemory` | 知识图谱 | 实体关系密集型对话 |

---

### 3.4 RAG 检索增强记忆

**原理：** 将所有历史消息向量化后存入向量数据库（如 LanceDB、Chroma、Qdrant）。每次用户提问时，用当前问题检索最相关的历史片段，注入上下文。

**优点：**
- 理论上可处理无限长对话历史
- 按相关性检索，而非按时间截断
- 可跨会话检索（"你上次帮我写的那个函数"）

**缺点：**
- 需要向量数据库基础设施（AQBot 已有 LanceDB）
- 检索质量依赖 embedding 模型
- 可能遗漏"不相关但重要"的上下文（如对话中途更改的约束条件）
- 单独使用效果不如与摘要结合

**AQBot 的优势：**
AQBot 已经集成了 LanceDB 向量数据库（`~/.aqbot/vector_db/`），具备 RAG 的基础设施。可以考虑将对话消息也纳入向量化索引。

---

### 3.5 知识图谱记忆（KG Memory）

**原理：** 从对话中提取实体（人名、项目名、技术栈等）和关系（"用户正在开发 X"、"X 使用 Y 框架"），构建知识图谱。后续对话可以查询 KG 获取结构化上下文。

**优点：**
- 信息高度结构化，查询精确
- 实体关系不会在压缩中丢失
- 特别适合技术类对话（涉及大量命名实体）

**缺点：**
- 实现复杂度最高
- 实体提取需要额外 LLM 调用
- 对非结构化对话（闲聊）效果有限

---

### 3.6 MemGPT / Letta — 分层虚拟记忆

**原理：** 受操作系统内存管理启发，将 LLM 的上下文管理抽象为三级存储：

```
┌──────────────────────────────────────┐
│  Core Memory (核心记忆 ≈ CPU 寄存器)  │  ← 始终在 context 中
│  用户画像、Agent 人设、当前任务状态      │
├──────────────────────────────────────┤
│  Recall Memory (回忆记忆 ≈ RAM)       │  ← 可搜索的对话日志
│  完整对话历史，语义搜索访问              │
├──────────────────────────────────────┤
│  Archival Memory (归档记忆 ≈ 硬盘)    │  ← 向量数据库长期存储
│  知识库、文档、长期事实                  │
└──────────────────────────────────────┘
```

**核心创新：** Agent 自己决定何时将信息从一级存储"换出/换入"另一级存储（类似 OS 的内存分页 page swap），通过 tool call 实现记忆管理。

**Letta vs Mem0 对比：**

| 维度 | Letta (MemGPT) | Mem0 |
|------|---------------|------|
| 定位 | Agent 运行时（完整框架） | 可插拔记忆层（框架无关） |
| 记忆管理 | Agent 主动管理（自编辑） | 被动提取 + 语义检索 |
| 集成方式 | 需要运行在 Letta 平台内 | 简单的 add()/search() API |
| 准确率 | 复杂推理场景更强 | 事实性检索基准更高（~68.5%） |
| 延迟 | 较高（tool call 开销） | 低（~1.4s/query） |
| 适用 | 深度有状态 Agent | 通用聊天记忆增强 |

---

### 3.7 Token 级裁剪（LLMLingua）

**原理：** 微软研究院的 LLMLingua 使用小模型（如 GPT-2、XLM-RoBERTa）估算每个 token 的信息量，删除低信息量 token，保留高信息密度 token。

**版本演进：**
- **LLMLingua v1（2023 EMNLP）**：基于困惑度（perplexity）的 token 裁剪，最高 20x 压缩
- **LLMLingua-2（2024 ACL）**：数据蒸馏 + 双向 Transformer 分类，3-6x 更快，2-5x 压缩比

**优点：**
- 不需要额外 LLM 调用（使用轻量模型）
- 可保留原文结构（而非生成摘要）
- 与 RAG 结合效果极佳（先检索再压缩）

**缺点：**
- 需要部署压缩模型（桌面端不太实际）
- 压缩后文本对人类不可读
- 对对话场景的适配不如摘要方案

**适用场景：** 更适合长文档处理、RAG pipeline 中的 chunk 压缩，不太适合作为对话压缩的主方案。

---

## 四、AQBot 推荐方案

### 4.1 推荐：混合摘要缓冲（Summary + Buffer） + 可选 RAG 增强

基于 AQBot 的特点（多模型支持、本地桌面端、已有 LanceDB），推荐分阶段实现：

#### 第一阶段：基础压缩（Summary + Buffer）

```
发送给 LLM 的上下文结构：
┌─────────────────────────────┐
│  System Prompt               │
├─────────────────────────────┤
│  [Summary] 历史摘要           │  ← 由 LLM 生成，定期更新
├─────────────────────────────┤
│  [Buffer] 最近 N 轮原文       │  ← 完整保留
├─────────────────────────────┤
│  当前用户输入                 │
└─────────────────────────────┘
```

**关键参数设计：**

| 参数 | 建议值 | 说明 |
|------|--------|------|
| Buffer 保留轮次 | 最近 6-10 轮 | 保留完整上下文的对话轮数 |
| 压缩触发阈值 | 模型 context window 的 60-70% | 留出 30-40% 给回复和安全边际 |
| 摘要最大长度 | 模型 context window 的 15-20% | 摘要不应占用太多空间 |
| 摘要更新策略 | 增量式（仅压缩新移出 buffer 的消息） | 避免每次全量重新摘要 |

**压缩触发流程：**

```
用户发送消息
  → 计算: system_prompt + summary + buffer + user_input 的 token 数
  → 如果 < 阈值: 直接发送
  → 如果 >= 阈值:
      1. 取 buffer 中最老的 M 轮消息
      2. 调用 LLM: "将以下对话合并到已有摘要中: {old_summary} + {old_messages}"
      3. 用新摘要替换旧摘要
      4. 从 buffer 中移除已压缩的消息
      5. 发送请求
```

**摘要 Prompt 设计建议：**

```
你是一个对话摘要助手。请将以下对话历史合并到已有摘要中。

要求：
1. 保留所有用户明确表达的需求、偏好和决策
2. 保留关键技术细节（代码片段、配置、错误信息等）
3. 保留待办事项和未解决的问题
4. 用简洁的要点形式组织
5. 如果有冲突信息，以最新的为准

已有摘要：
{existing_summary}

新增对话内容：
{new_messages}

请输出更新后的摘要：
```

#### 第二阶段：RAG 增强（可选）

利用 AQBot 已有的 LanceDB，将对话消息也纳入向量索引：

1. 每条消息存储时同时生成 embedding
2. 用户提问时，除了 Summary + Buffer，还检索 Top-K 相关历史消息
3. 将检索到的相关消息插入上下文的 `[Relevant History]` 区域

```
发送给 LLM 的上下文结构（RAG 增强版）：
┌─────────────────────────────┐
│  System Prompt               │
├─────────────────────────────┤
│  [Summary] 历史摘要           │
├─────────────────────────────┤
│  [Relevant] 检索到的相关历史  │  ← RAG 增强
├─────────────────────────────┤
│  [Buffer] 最近 N 轮原文       │
├─────────────────────────────┤
│  当前用户输入                 │
└─────────────────────────────┘
```

### 4.2 实现注意事项

1. **摘要模型选择**：优先使用当前对话所用的同一模型做摘要（保持风格一致），若模型不支持或成本过高，可用轻量模型（如 GPT-4o-mini）
2. **Token 计数**：需要按实际模型的 tokenizer 计数，不同模型 tokenizer 不同（建议使用 tiktoken 或各厂商 SDK 的计数 API）
3. **摘要持久化**：摘要应存入 `aqbot.db`，关联到对应的 conversation，避免每次打开对话重新压缩
4. **用户可见性**：考虑在 UI 上提示"较早的消息已被压缩为摘要"，让用户有感知
5. **摘要失败回退**：如果摘要生成失败，回退到滑动窗口策略，确保对话不中断
6. **多模型 token 上限差异**：不同模型 context window 不同，压缩策略的参数应跟随模型动态调整

### 4.3 数据库 Schema 建议

```sql
-- 对话摘要表
CREATE TABLE conversation_summaries (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    summary_text TEXT NOT NULL,           -- 摘要内容
    compressed_until_message_id TEXT,     -- 摘要覆盖到哪条消息
    token_count INTEGER,                  -- 摘要的 token 数
    model_used TEXT,                      -- 生成摘要所用模型
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 可选：消息 embedding 表（RAG 增强用）
CREATE TABLE message_embeddings (
    message_id TEXT PRIMARY KEY REFERENCES messages(id),
    conversation_id TEXT NOT NULL,
    embedding BLOB NOT NULL,              -- 向量数据
    model_used TEXT,                      -- embedding 模型
    created_at INTEGER NOT NULL
);
```

---

## 五、参考资料

### 学术论文
- [Prompt Compression for Large Language Models: A Survey](https://arxiv.org/html/2410.12388v2) — 全面综述
- [LLMLingua-2: Data Distillation for Efficient and Faithful Task-Agnostic Prompt Compression](https://arxiv.org/abs/2403.12968) — ACL 2024
- [Extending Context Window of LLMs via Semantic Compression](https://aclanthology.org/2024.findings-acl.306/) — ACL 2024
- [Recurrent Context Compression](https://openreview.net/forum?id=GYk0thSY1M)
- [Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory](https://arxiv.org/abs/2504.19413)

### 开源项目
- [LangChain Memory](https://docs.langchain.com/oss/python/langchain/short-term-memory) — Python 最成熟的对话记忆框架
- [Letta (MemGPT)](https://github.com/letta-ai/letta) — 分层虚拟记忆 Agent 框架
- [Mem0](https://github.com/mem0ai/mem0) — 可插拔 AI 记忆层
- [Microsoft LLMLingua](https://github.com/microsoft/LLMLingua) — Token 级 prompt 压缩
- [Awesome-Context-Compression-LLMs](https://github.com/broalantaps/Awesome-Context-Compression-LLMs) — 资源汇总

### 产品实践
- [OpenAI: Memory and new controls for ChatGPT](https://openai.com/index/memory-and-new-controls-for-chatgpt/)
- [ChatGPT — Context Window, Token Limits, and Memory](https://www.datastudios.org/post/chatgpt-context-window-token-limits-and-memory-how-session-recall-and-long-input-handling-work)
- [Mem0 vs Letta Comparison](https://vectorize.io/articles/mem0-vs-letta)
- [AI Memory Benchmark: Mem0 vs OpenAI vs LangMem vs MemGPT](https://mem0.ai/blog/benchmarked-openai-memory-vs-langmem-vs-memgpt-vs-mem0-for-long-term-memory-here-s-how-they-stacked-up)

### 技术博客
- [Long-Context LLMs: Sliding Window Summarization Guide](https://machinelearningplus.com/gen-ai/long-context-sliding-window-summarization/)
- [Top Techniques to Manage Context Lengths in LLMs](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms)
- [Compression Tactics for Long Context Windows in LLMs](https://dataguy.in/artificial-intelligence/compression-tactics-llm-context-windows/)
- [Survey of AI Agent Memory Frameworks](https://www.graphlit.com/blog/survey-of-ai-agent-memory-frameworks/)
