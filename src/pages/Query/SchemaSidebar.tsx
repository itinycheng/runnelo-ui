import { useEffect, useMemo, useState } from "react";
import type { Key } from "react";
import { useTranslation } from "react-i18next";
import { Button, Empty, Flex, Input, Select, Spin, Tree, Typography, type TreeDataNode } from "antd";
import { DatabaseOutlined, MenuFoldOutlined, SearchOutlined, TableOutlined } from "@ant-design/icons";
import { getDatabases, getTables } from "@/api/query";

interface SchemaSidebarProps {
  datasourceId?: string;
  datasources: { label: string; value: string }[];
  onDatasourceChange: (id: string) => void;
  showHeader?: boolean;
  onCollapse?: () => void;
  /** Insert the clicked table (qualified as `db.table`) into the editor. */
  onInsert: (text: string) => void;
}

/** Build a leaf node for a table; its key is the qualified `db.table` name. */
function tableNode(db: string, table: string): TreeDataNode {
  return { key: `${db}.${table}`, title: table, isLeaf: true, icon: <TableOutlined /> };
}

/** Return a copy of the tree with `children` attached to the node keyed by `db`. */
function attachTables(nodes: TreeDataNode[], db: string, children: TreeDataNode[]): TreeDataNode[] {
  return nodes.map((n) => (n.key === db ? { ...n, children } : n));
}

/** Filter the (partially loaded) tree by a lowercased query over db and table names. */
function filterTree(nodes: TreeDataNode[], q: string): TreeDataNode[] {
  if (!q) return nodes;
  const out: TreeDataNode[] = [];
  for (const db of nodes) {
    if (String(db.key).toLowerCase().includes(q)) {
      out.push(db);
    } else {
      const kids = (db.children ?? []).filter((c) => String(c.title).toLowerCase().includes(q));
      if (kids.length) out.push({ ...db, children: kids });
    }
  }
  return out;
}

/** Sider header: database icon + "Schema" label. */
function SchemaHeader({ onCollapse }: { onCollapse?: () => void }) {
  const { t } = useTranslation();
  return (
    <Flex align="center" justify="space-between" style={{ minHeight: 40 }}>
      <Flex align="center" gap={8}>
        <DatabaseOutlined style={{ color: "var(--ant-color-text-tertiary)" }} />
        <Typography.Text strong>{t("query.schema")}</Typography.Text>
      </Flex>
      {onCollapse && (
        <Button
          type="text"
          size="small"
          shape="circle"
          icon={<MenuFoldOutlined />}
          aria-label={t("query.hideSchema")}
          title={t("query.hideSchema")}
          onClick={onCollapse}
        />
      )}
    </Flex>
  );
}

// Prettier expands this compact tree renderer slightly past the repository's
// generic function-size guard; keeping its tightly coupled UI state together is clearer.
// eslint-disable-next-line max-lines-per-function
export default function SchemaSidebar({
  datasourceId,
  datasources,
  onDatasourceChange,
  showHeader = true,
  onCollapse,
  onInsert,
}: SchemaSidebarProps) {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setTreeData([]);
      setExpandedKeys([]);
      if (!datasourceId) return;
      setLoading(true);
      try {
        const dbs = await getDatabases(datasourceId);
        if (!cancelled) setTreeData(dbs.map((db) => ({ key: db, title: db, icon: <DatabaseOutlined /> })));
      } catch (err) {
        console.error("[Query] load databases failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [datasourceId]);

  const onLoadData = async (node: TreeDataNode) => {
    if (!datasourceId || node.children) return;
    const db = String(node.key);
    const tables = await getTables(datasourceId, db);
    setTreeData((origin) =>
      attachTables(
        origin,
        db,
        tables.map((tb) => tableNode(db, tb)),
      ),
    );
  };

  const q = filter.trim().toLowerCase();
  const shown = useMemo(() => filterTree(treeData, q), [treeData, q]);
  // While searching, expand every database that survived the filter so matches show.
  const searchExpand = useMemo(() => (q ? shown.map((db) => db.key) : null), [q, shown]);

  return (
    <Flex
      vertical
      style={{ height: "100%", minWidth: 0, background: "var(--ant-color-bg-container)", overflow: "hidden" }}
    >
      <Flex vertical gap={8} style={{ flexShrink: 0, padding: "8px 12px 12px" }}>
        {showHeader && <SchemaHeader onCollapse={onCollapse} />}
        <Select
          size="small"
          placeholder={t("query.selectDatasource")}
          options={datasources}
          value={datasourceId}
          onChange={onDatasourceChange}
          showSearch
          optionFilterProp="label"
          data-testid="datasource-select"
        />
        <Input
          size="small"
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t("query.searchTable")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          disabled={!datasourceId}
        />
      </Flex>
      <div
        style={{ flex: 1, minHeight: 0, overflowY: "auto", borderTop: "1px solid var(--ant-color-split)", padding: 8 }}
      >
        <SchemaBody
          datasourceId={datasourceId}
          loading={loading}
          empty={treeData.length === 0}
          treeData={shown}
          expandedKeys={searchExpand ?? expandedKeys}
          onExpand={setExpandedKeys}
          onLoadData={onLoadData}
          onInsert={onInsert}
        />
      </div>
    </Flex>
  );
}

interface SchemaBodyProps {
  datasourceId?: string;
  loading: boolean;
  empty: boolean;
  treeData: TreeDataNode[];
  expandedKeys: Key[];
  onExpand: (keys: Key[]) => void;
  onLoadData: (node: TreeDataNode) => Promise<void>;
  onInsert: (text: string) => void;
}

function SchemaBody(props: SchemaBodyProps) {
  const { t } = useTranslation();
  const { datasourceId, loading, empty, treeData, expandedKeys, onExpand, onLoadData, onInsert } = props;

  if (!datasourceId) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("query.selectDatasourceForTables")} />;
  }
  if (loading) {
    return (
      <Flex justify="center" style={{ padding: 24 }}>
        <Spin size="small" />
      </Flex>
    );
  }
  if (empty) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("query.noDatabases")} />;
  }
  return (
    <Tree
      blockNode
      showIcon
      treeData={treeData}
      loadData={onLoadData}
      expandedKeys={expandedKeys}
      onExpand={onExpand}
      onSelect={(_, { node }) => {
        // Leaf = table → insert; database row → toggle expand (loads tables lazily).
        if (node.isLeaf) {
          onInsert(String(node.key));
          return;
        }
        const key = node.key;
        onExpand(expandedKeys.includes(key) ? expandedKeys.filter((k) => k !== key) : [...expandedKeys, key]);
      }}
    />
  );
}
