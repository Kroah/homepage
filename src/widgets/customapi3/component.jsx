import { useTranslation } from "next-i18next";

import Container from "components/services/widget/container";
import BlockTable from "components/services/widget/blocktable";
import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { t } = useTranslation();

  const { widget } = service;

  const { mappings = [], refreshInterval = 10000, display = "block" } = widget;
  const { data: customData, error: customError } = useWidgetAPI(widget, null, {
    refreshInterval: Math.max(1000, refreshInterval),
  });

  if (customError) {
    return <Container service={service} error={customError} />;
  }

  return (
    <Container service={service}>
      <BlockTable
        display={display}
        customData={customData}
        mappings={mappings}
      />
    </Container>
  );
}
