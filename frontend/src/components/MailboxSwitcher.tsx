// "我的地址"列表：多开虚拟邮箱的切换入口。
// 读信接口不需要鉴权，所以切换是瞬时的，这里只负责呈现与选中。
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueries } from "@tanstack/react-query";
import clsx from "clsx";
import { getMailboxMeta } from "../services/api.ts";
import type { MailboxRecord } from "../lib/mailboxHistory.ts";
import InboxIcon from "./icons/InboxIcon.tsx";
import MailIcon from "./icons/MailIcon.tsx";
import CheckIcon from "./icons/CheckIcon.tsx";
import { TrashIcon } from "./icons/TrashIcon.tsx";

// 折叠时展示的条数
const COLLAPSED_COUNT = 5;
// 单次最多轮询几个地址的收信概况，避免地址多了打太多请求
const META_QUERY_LIMIT = 10;

interface MailboxSwitcherProps {
  mailboxes: MailboxRecord[];
  currentAddress?: string;
  onSwitch: (record: MailboxRecord) => void;
  onRemove: (record: MailboxRecord) => void;
  onRename: (address: string, label: string) => void;
}

export function MailboxSwitcher({
  mailboxes,
  currentAddress,
  onSwitch,
  onRemove,
  onRename,
}: MailboxSwitcherProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const visible = expanded ? mailboxes : mailboxes.slice(0, COLLAPSED_COUNT);

  const metaQueries = useQueries({
    queries: visible.slice(0, META_QUERY_LIMIT).map((record) => ({
      queryKey: ["mailbox-meta", record.address],
      queryFn: () => getMailboxMeta(record.address),
      refetchInterval: () =>
        document.visibilityState === "visible" ? 60000 : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      staleTime: 30000,
      retry: false,
    })),
  });

  const metaByAddress = useMemo(() => {
    const map = new Map<string, { count: number; latest: number | null }>();
    visible.slice(0, META_QUERY_LIMIT).forEach((record, index) => {
      const meta = metaQueries[index]?.data;
      if (!meta) return;
      const latest = meta.latestEmailCreatedAt
        ? new Date(meta.latestEmailCreatedAt).getTime()
        : null;
      map.set(record.address, {
        count: meta.count,
        latest: latest !== null && Number.isNaN(latest) ? null : latest,
      });
    });
    return map;
  }, [visible, metaQueries]);

  const startEdit = (record: MailboxRecord) => {
    setEditing(record.address);
    setDraftLabel(record.label ?? "");
  };

  const commitEdit = (address: string) => {
    onRename(address, draftLabel);
    setEditing(null);
  };

  if (mailboxes.length === 0) {
    return null;
  }

  return (
    <div className="w-full md:max-w-[350px] mb-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
        <InboxIcon className="size-4 text-cyan-400" />
        {t("My addresses")}
        <span className="ml-auto text-xs font-normal text-zinc-400">
          {mailboxes.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {visible.map((record) => {
          const isCurrent = record.address === currentAddress;
          const meta = metaByAddress.get(record.address);
          // 当前地址视为已查看；没有已查看记录时退回到创建时间
          const hasNew =
            !isCurrent &&
            !!meta?.latest &&
            meta.latest > (record.lastSeenAt ?? record.createdAt);
          const isEditing = editing === record.address;

          return (
            <div
              key={record.address}
              className={clsx(
                "group/row relative rounded-md border transition-colors",
                isCurrent
                  ? "border-cyan-500/40 bg-cyan-500/10"
                  : "border-transparent bg-white/5 hover:border-cyan-50/20 hover:bg-white/10",
              )}>
              <button
                type="button"
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => onSwitch(record)}
                className="w-full px-3 pt-2.5 pb-1 text-left">
                <div className="flex items-center gap-2 pr-7">
                  {isCurrent ? (
                    <CheckIcon className="size-3.5 shrink-0 text-cyan-400" />
                  ) : (
                    <span className="size-3.5 shrink-0" />
                  )}
                  <span
                    className={clsx(
                      "truncate text-sm",
                      isCurrent ? "text-cyan-300" : "text-zinc-100",
                    )}>
                    {record.address}
                  </span>
                  {hasNew && (
                    <span
                      title={t("New mail")}
                      className="size-2 shrink-0 rounded-full bg-cyan-400"
                    />
                  )}
                </div>
              </button>

              <div className="flex items-center gap-2 pl-[34px] pr-7 pb-2.5 text-xs text-zinc-400">
                {isEditing ? (
                  <input
                    autoFocus
                    value={draftLabel}
                    onChange={(e) => setDraftLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(record.address);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    onBlur={() => commitEdit(record.address)}
                    placeholder={t("Label")}
                    className="w-full rounded border border-cyan-50/20 bg-white/10 px-1.5 py-0.5 text-xs text-zinc-100 outline-none focus:border-cyan-500"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(record)}
                    title={t("Label")}
                    className="truncate text-left hover:text-cyan-400 transition-colors">
                    {record.label ||
                      `${t("Created at")} ${new Date(record.createdAt).toLocaleDateString()}`}
                  </button>
                )}
                {!isEditing && !!meta?.count && (
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <MailIcon className="size-3" />
                    {meta.count}
                  </span>
                )}
              </div>

              {!isCurrent && (
                <button
                  type="button"
                  onClick={() => onRemove(record)}
                  title={t("Remove from list")}
                  className="absolute right-2 top-2 rounded p-1 text-zinc-500 opacity-0 transition-opacity hover:text-red-400 focus:opacity-100 group-hover/row:opacity-100">
                  <TrashIcon className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {mailboxes.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors">
          {expanded ? t("Collapse") : t("Show all")}
        </button>
      )}
    </div>
  );
}
