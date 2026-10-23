import { Select } from "antd";
import { useTranslation } from "react-i18next";
import { listFlows } from "@/api/picker";
import { useRemoteOptions } from "./useRemoteOptions";

interface Props {
  value?: number;
  onChange?: (value?: number) => void;
}

export default function FlowSelect({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { data, loading } = useRemoteOptions("flows", listFlows, []);
  return (
    <Select
      showSearch
      allowClear
      loading={loading}
      value={value}
      onChange={onChange}
      placeholder={t("picker.selectFlow")}
      options={data?.map((flow) => ({ value: flow.id, label: `${flow.name} (#${flow.id})` }))}
      optionFilterProp="label"
    />
  );
}
