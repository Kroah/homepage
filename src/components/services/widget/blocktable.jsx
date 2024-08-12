import { useTranslation } from "next-i18next";

import Block from "components/services/widget/block";
import Block2 from "components/services/widget/block2";
//import classNames from "classnames";

/*	This work is licensed under Creative Commons GNU LGPL License.

	License: http://creativecommons.org/licenses/LGPL/2.1/
   Version: 0.9
	Author:  Stefan Goessner/2006
	Web:     http://goessner.net/
*/
function json2xml(o, tab) {
  var toXml = function(v, name, ind) {
     var xml = "";
     if (v instanceof Array) {
        for (var i=0, n=v.length; i<n; i++)
           xml += ind + toXml(v[i], name, ind+"\t") + "\n";
     }
     else if (typeof(v) == "object") {
        var hasChild = false;
        xml += ind + "<" + name;
        for (var m in v) {
           if (m.charAt(0) == "@")
              xml += " " + m.substr(1) + "=\"" + v[m].toString() + "\"";
           else
              hasChild = true;
        }
        xml += hasChild ? ">" : "/>";
        if (hasChild) {
           for (var m in v) {
              if (m == "#text")
                 xml += v[m];
              else if (m == "#cdata")
                 xml += "<![CDATA[" + v[m] + "]]>";
              else if (m.charAt(0) != "@")
                 xml += toXml(v[m], m, ind+"\t");
           }
           xml += (xml.charAt(xml.length-1)=="\n"?ind:"") + "</" + name + ">";
        }
     }
     else {
        xml += ind + "<" + name + ">" + v.toString() +  "</" + name + ">";
     }
     return xml;
  }, xml="";
  for (var m in o)
     xml += toXml(o[m], m, "");
  return tab ? xml.replace(/\t/g, tab) : xml.replace(/\t|\n/g, "");
}

const flatten = (obj, roots = [], sep = '/') => 
  (Object.prototype.toString.call(obj) === '[object Object]')
    ? Object
        // find props of given object
        .keys(obj)
        // return an object by iterating props
        .reduce((memo, prop) => Object.assign(
          // create a new object
          {},
          // include previously returned object
          memo,
          Object.prototype.toString.call(obj[prop]) === '[object Object]'
            // keep working if value is an object
            ? flatten(obj[prop], roots.concat([prop]), sep)
            // include current prop and value and prefix prop with the roots
            : {[roots.concat([prop]).concat(obj[prop]).join(sep)]:""}
        ), {})
    : {[obj]:""};

function getXpath(field) {
  return ("root/" + Object.keys(flatten (field))[0] + "/text()");
}

function getValues(field, data) {
  let json2 = { "root" : data };
  let xmlString = json2xml (json2);
  let xml = new DOMParser().parseFromString(xmlString,"text/xml");

  let xpath = getXpath (field);
  console.log (xpath);
  let result = new XPathEvaluator().evaluate(
    //  "/a/b/c/d",
    //  "/root/sources/lastSnapshot/source/path/text()",
      xpath,
      xml,
      null,
      XPathResult.ANY_TYPE,
    //  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
  );

  const tagNames = [];
  /*
  while (true) {
    let node = result.iterateNext();
    if (node == null) break;
    tagNames.push(node.nodeValue);
  }
  */
  let node2;
  while (node2= result.iterateNext())
    tagNames.push(node2.nodeValue);

  //return (tagNames.join(", "));
  return (tagNames);
}

function getValue(field, data) {
  let value = data;
  let lastField = field;
  let key = "";

  while (typeof lastField === "object") {
    key = Object.keys(lastField)[0] ?? null;

    if (key === null) {
      break;
    }

    value = value[key];
    lastField = lastField[key];
  }

  if (typeof value === "undefined") {
    return null;
  }

  return value[lastField] ?? null;
}

function formatValue(t, mapping, rawValue) {
  let value = rawValue;

  // Remap the value.
  const remaps = mapping?.remap ?? [];
  for (let i = 0; i < remaps.length; i += 1) {
    const remap = remaps[i];
    if (remap?.any || remap?.value === value) {
      value = remap.to;
      break;
    }
  }

  // Scale the value. Accepts either a number to multiply by or a string
  // like "12/345".
  const scale = mapping?.scale;
  if (typeof scale === "number") {
    value *= scale;
  } else if (typeof scale === "string") {
    const parts = scale.split("/");
    const numerator = parts[0] ? parseFloat(parts[0]) : 1;
    const denominator = parts[1] ? parseFloat(parts[1]) : 1;
    value = (value * numerator) / denominator;
  }

  // Format the value using a known type.
  switch (mapping?.format) {
    case "number":
      value = t("common.number", {
        value: parseInt(value, 10),
        lng: mapping?.locale,
        decimals: mapping?.decimals,
      });
      break;
    case "float":
      value = t("common.number", {
        value,
        lng: mapping?.locale,
        decimals: mapping?.decimals,
      });
      break;
    case "percent":
      value = t("common.percent", {
        value,
        lng: mapping?.locale,
        decimals: mapping?.decimals,
      });
      break;
    case "bytes":
      value = t("common.bytes", {
        value: parseInt(value, 10),
        lng: mapping?.locale,
        decimals: mapping?.decimals,
        binary: mapping?.binary,
        bits: mapping?.bits,
      });
      break;
    case "bitrate":
      value = t("common.bitrate", {
        value: parseInt(value, 10),
        lng: mapping?.locale,
        decimals: mapping?.decimals,
        binary: mapping?.binary,
        bits: mapping?.bits,
      });
      break;
    case "date":
      value = t("common.date", {
        value,
        lng: mapping?.locale,
        dateStyle: mapping?.dateStyle ?? "long",
        timeStyle: mapping?.timeStyle,
      });
      break;
    case "relativeDate":
      value = t("common.relativeDate", {
        value,
        lng: mapping?.locale,
        style: mapping?.style,
        numeric: mapping?.numeric,
      });
      break;
    case "text":
    default:
    // nothing
  }

  // Apply fixed prefix.
  const prefix = mapping?.prefix;
  if (prefix) {
    value = `${prefix} ${value}`;
  }

  // Apply fixed suffix.
  const suffix = mapping?.suffix;
  if (suffix) {
    value = `${value} ${suffix}`;
  }

  return value;
}

function getColor(mapping, customData) {
  const value = getValue(mapping.additionalField.field, customData);
  const { color } = mapping.additionalField;

  switch (color) {
    case "adaptive":
      try {
        const number = parseFloat(value);
        return number > 0 ? "text-emerald-300" : "text-rose-300";
      } catch (e) {
        return "";
      }
    case "black":
      return `text-black`;
    case "white":
      return `text-white`;
    case "theme":
      return `text-theme-500`;
    default:
      return "";
  }
}

export default function BlockTable({ display, customData, mappings }) {
  const { t } = useTranslation();

  if (!customData) {
    switch (display) {
      case "list":
        return (
          <div className="flex flex-col w-full">
            {mappings.map((mapping) => (
              <div
                key={mapping.label}
                className="bg-theme-200/50 dark:bg-theme-900/20 rounded m-1 flex-1 flex flex-row items-center justify-between p-1 text-xs animate-pulse"
              >
                <div className="font-thin pl-2">{mapping.label}</div>
                <div className="flex flex-row text-right">
                  <div className="font-bold mr-2">-</div>
                </div>
              </div>
            ))}
          </div>
        );

      case "list2":
        let rowHeaders = [];
        for (let i=0; i< mappings.length; i++) {
          let mapping = mappings[i];
          rowHeaders.push ({label: mapping.label, align: mapping.align});
        }
  
        return (
          <div className="w-full p-1" style={{display: "table"}}>
              <div className="bg-theme-200/50 dark:bg-theme-900/20 rounded m-1 items-center justify-between p-1 text-xs animate-pulse" style={{display: "table-row"}}>
                {rowHeaders.map((header) => (
                  <div
                  key={header.label}
                  className="font-bold text-xs uppercase" style={{display: "table-cell", textAlign: "center"}}
                  >{t(header.label)}</div>
                ))}
              </div>
              <div className="bg-theme-200/50 dark:bg-theme-900/20 rounded m-1 items-center justify-between p-1 text-xs animate-pulse" style={{display: "table-row"}}>
                {rowHeaders.map((header) => (
                  <div
                    key={header.label}
                    className="font-thin text-sm" style={{display: "table-cell", textAlign: header.align}}
                    >{"-"}</div>
                ))}
              </div>
          </div>
        );
    
      case "list3":
        return (
          <div>
            {mappings.map((item) => (
              <Block label={item.label} key={item.label} />
            ))}
          </div>
        );

      default:
        return (
          <div>
            {mappings.map((item) => (
              <Block label={item.label} key={item.label} />
            ))}
          </div>
        );
    }
  }

  switch (display) {
    case "list":
      return (
        <div className="flex flex-col w-full">
          {mappings.map((mapping) => (
            <div
              key={mapping.label}
              className="bg-theme-200/50 dark:bg-theme-900/20 rounded m-1 flex-1 flex flex-row items-center justify-between p-1 text-xs"
            >
              <div className="font-thin pl-2">{mapping.label}</div>
              <div className="flex flex-row text-right">
                <div className="font-bold mr-2">{formatValue(t, mapping, getValue(mapping.field, customData))}</div>
                {mapping.additionalField && (
                  <div className={`font-bold mr-2 ${getColor(mapping, customData)}`}>
                    {formatValue(t, mapping.additionalField, getValue(mapping.additionalField.field, customData))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );

    case "list2":
      let colsValues = [];
      let rowHeaders = [];
      for (let i=0; i< mappings.length; i++) {
        let mapping = mappings[i];
        rowHeaders.push ({label: mapping.label, align: mapping.align});
        let values = getValues(mapping.field, customData).map ((value) => formatValue(t, mapping, value));
        let values2= [];
        for (let j=0; j< values.length; j++)
          values2.push ({value: values[j], align: mapping.align});
        colsValues.push (values2);
      }
      let rowsValues = colsValues[0].map((_, colIndex) => colsValues.map(row => row[colIndex]));

      return (
        <div className="w-full p-1" style={{display: "table"}}>
            <div className="bg-theme-200/50 dark:bg-theme-900/20 rounded m-1 items-center justify-between p-1 text-xs" style={{display: "table-row"}}>
              {rowHeaders.map((header) => (
                <div
                  key={header.label}
                  className="font-bold text-xs uppercase" style={{display: "table-cell", textAlign: "center"}}
                >{t(header.label)}</div>
              ))}
            </div>
          {rowsValues.map((rowValues,indexRow) => (
            <div
              key={indexRow}
              className="bg-theme-200/50 dark:bg-theme-900/20 rounded m-1 items-center justify-between p-1 text-xs" style={{display: "table-row"}}
            >
              {rowValues.map((cell,indexCell) => (
                <div
                  key={indexCell}
                  className="font-thin text-sm" style={{display: "table-cell", textAlign: cell.align}}
                >{cell.value === undefined || cell.value === null ? "-" : cell.value}</div>
              ))}
            </div>
          ))}
        </div>
      );
        
    case "list3":
      return (
        <div>
          {mappings.map((mapping) => (
            <Block2
              label={mapping.label}
              key={mapping.label}
              values={getValues(mapping.field, customData).map ((value) => formatValue(t, mapping, value))}
            />
          ))}
        </div>
      );
      
    default:
      return (
        <div>
          {mappings.map((mapping) => (
            <Block
              label={mapping.label}
              key={mapping.label}
              value={formatValue(t, mapping, getValue(mapping.field, customData))}
            />
          ))}
        </div>
      );
  }
}