// 本地地址簿：把用过的地址存在浏览器里，与 cookie 的单槽位解耦。
// 纯本地、零网络请求；读写全部兜底，隐私模式下静默失效。

export const STORAGE_KEY = "vmail_mailboxes";

// 最多保留的地址条数，超出按最近使用时间淘汰
const MAX_ITEMS = 50;

export interface MailboxRecord {
  address: string;
  // encrypt(address, COOKIES_SECRET) 的密文；拿不到 cookiesSecret 时为 null
  password: string | null;
  label?: string;
  createdAt: number;
  lastUsedAt: number;
  // 本地"已查看"时间戳，用于模拟新邮件提醒
  lastSeenAt?: number;
}

// 最近使用的排在最前
function sortByRecency(items: MailboxRecord[]): MailboxRecord[] {
  return [...items].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

function read(): MailboxRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MailboxRecord =>
        !!item && typeof item.address === "string" && item.address.length > 0,
    );
  } catch {
    // 隐私模式或数据损坏：当作没有本地地址簿
    return [];
  }
}

function write(items: MailboxRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // 隐私模式或配额不足：降级为不记录，不影响收发信主流程
  }
}

export function listMailboxes(): MailboxRecord[] {
  return sortByRecency(read());
}

// 地址已存在则更新密码与使用时间，否则新增
export function upsertMailbox(input: {
  address: string;
  password?: string | null;
  label?: string;
}): MailboxRecord[] {
  const now = Date.now();
  const items = read();
  const index = items.findIndex((item) => item.address === input.address);

  if (index === -1) {
    items.push({
      address: input.address,
      password: input.password ?? null,
      label: input.label,
      createdAt: now,
      lastUsedAt: now,
      // 新建/刚登录即视为已查看，避免立刻误报新邮件
      lastSeenAt: now,
    });
  } else {
    const current = items[index];
    items[index] = {
      ...current,
      password: input.password ?? current.password,
      label: input.label ?? current.label,
      lastUsedAt: now,
    };
  }

  const next = sortByRecency(items).slice(0, MAX_ITEMS);
  write(next);
  return next;
}

// 切换地址时刷新使用时间；seen 为真时同时标记已查看
export function touchMailbox(address: string, seen = false): MailboxRecord[] {
  const now = Date.now();
  const items = read();
  const index = items.findIndex((item) => item.address === address);

  if (index !== -1) {
    items[index] = {
      ...items[index],
      lastUsedAt: now,
      lastSeenAt: seen ? now : items[index].lastSeenAt,
    };
  }

  const next = sortByRecency(items);
  write(next);
  return next;
}

export function renameMailbox(address: string, label: string): MailboxRecord[] {
  const items = read();
  const index = items.findIndex((item) => item.address === address);

  if (index !== -1) {
    items[index] = { ...items[index], label: label.trim() || undefined };
  }

  const next = sortByRecency(items);
  write(next);
  return next;
}

export function removeMailbox(address: string): MailboxRecord[] {
  const next = sortByRecency(read().filter((item) => item.address !== address));
  write(next);
  return next;
}

export function clearMailboxes(): MailboxRecord[] {
  write([]);
  return [];
}
