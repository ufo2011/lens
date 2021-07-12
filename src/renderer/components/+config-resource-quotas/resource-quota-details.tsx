/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import "./resource-quota-details.scss";
import React from "react";
import kebabCase from "lodash/kebabCase";
import { observer } from "mobx-react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { cpuUnitsToNumber, cssNames, unitsToBytes, metricUnitsToNumber } from "../../utils";
import type { KubeObjectDetailsProps } from "../kube-object";
import type { ResourceQuota } from "../../api/endpoints/resource-quota.api";
import { LineProgress } from "../line-progress";
import { Table, TableCell, TableHead, TableRow } from "../table";
import { KubeObjectMeta } from "../kube-object/kube-object-meta";

interface Props extends KubeObjectDetailsProps<ResourceQuota> {
}

function transformUnit(name: string, value: string): number {
  if (name.includes("memory") || name.includes("storage")) {
    return unitsToBytes(value);
  }

  if (name.includes("cpu")) {
    return cpuUnitsToNumber(value);
  }

  return metricUnitsToNumber(value);
}

function renderQuotas(quota: ResourceQuota): JSX.Element[] {
  const { hard = {}, used = {} } = quota.status;

  return Object.entries(hard)
    .filter(([name]) => used[name])
    .map(([name, value]) => {
      const current = transformUnit(name, used[name]);
      const max = transformUnit(name, value);
      const usage = max === 0 ? 100 : Math.ceil(current / max * 100); // special case 0 max as always 100% usage

      return (
        <div key={name} className={cssNames("param", kebabCase(name))}>
          <span className="title">{name}</span>
          <span className="value">{used[name]} / {value}</span>
          <LineProgress
            max={max}
            value={current}
            tooltip={
              <p>Set: {value}. Usage: {`${usage}%`}</p>
            }
          />
        </div>
      );
    });
}

@observer
export class ResourceQuotaDetails extends React.Component<Props> {
  render() {
    const { object: quota } = this.props;

    if (!quota) return null;

    return (
      <div className="ResourceQuotaDetails">
        <KubeObjectMeta object={quota}/>

        <DrawerItem name="Quotas" className="quota-list">
          {renderQuotas(quota)}
        </DrawerItem>

        {quota.getScopeSelector().length > 0 && (
          <>
            <DrawerTitle title="Scope Selector"/>
            <Table className="paths">
              <TableHead>
                <TableCell>Operator</TableCell>
                <TableCell>Scope name</TableCell>
                <TableCell>Values</TableCell>
              </TableHead>
              {
                quota.getScopeSelector().map((selector, index) => {
                  const { operator, scopeName, values } = selector;

                  return (
                    <TableRow key={index}>
                      <TableCell>{operator}</TableCell>
                      <TableCell>{scopeName}</TableCell>
                      <TableCell>{values.join(", ")}</TableCell>
                    </TableRow>
                  );
                })
              }
            </Table>
          </>
        )}
      </div>
    );
  }
}
