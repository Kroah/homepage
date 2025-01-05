import { useTranslation } from "next-i18next";
import classNames from "classnames";

function getFinalValue(value) {
  return (value === undefined || value === null ? "-" : value)
}

export default function Block2({ values, label }) {
  const { t } = useTranslation();

  return (
    <div
      className={classNames(
        "bg-theme-200/50 dark:bg-theme-900/20 rounded m-1 flex-1 flex flex-col items-center justify-center text-center p-1",
        values === undefined ? "animate-pulse" : "",
        "service-block",
      )}
    >
      <div className="font-bold text-xs uppercase">{t(label)}</div>
      {values.map((value) => (
        <div key={getFinalValue(value)} className="font-thin text-sm">{getFinalValue(value)}</div>
      ))}
    </div>
  );
}
