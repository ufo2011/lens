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

import "./volume-claim-details.scss";

import React, { Fragment } from "react";
import { reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { DrawerItem, DrawerTitle } from "../drawer";
import { Badge } from "../badge";
import { podsStore } from "../+workloads-pods/pods.store";
import { Link } from "react-router-dom";
import { volumeClaimStore } from "./volume-claim.store";
import { ResourceMetrics } from "../resource-metrics";
import { VolumeClaimDiskChart } from "./volume-claim-disk-chart";
import { getDetailsUrl, KubeObjectDetailsProps, KubeObjectMeta } from "../kube-object";
import type { PersistentVolumeClaim } from "../../api/endpoints";
import { getActiveClusterEntity } from "../../api/catalog-entity-registry";
import { ClusterMetricsResourceType } from "../../../main/cluster";

interface Props extends KubeObjectDetailsProps<PersistentVolumeClaim> {
}

@observer
export class PersistentVolumeClaimDetails extends React.Component<Props> {
  @disposeOnUnmount
  clean = reaction(() => this.props.object, () => {
    volumeClaimStore.reset();
  });

  componentWillUnmount() {
    volumeClaimStore.reset();
  }

  render() {
    const { object: volumeClaim } = this.props;

    if (!volumeClaim) {
      return null;
    }
    const { storageClassName, accessModes } = volumeClaim.spec;
    const { metrics } = volumeClaimStore;
    const pods = volumeClaim.getPods(podsStore.items);
    const metricTabs = [
      "Disk"
    ];
    const isMetricHidden = getActiveClusterEntity()?.isMetricHidden(ClusterMetricsResourceType.VolumeClaim);

    return (
      <div className="PersistentVolumeClaimDetails">
        {!isMetricHidden && (
          <ResourceMetrics
            loader={() => volumeClaimStore.loadMetrics(volumeClaim)}
            tabs={metricTabs} object={volumeClaim} params={{ metrics }}
          >
            <VolumeClaimDiskChart/>
          </ResourceMetrics>
        )}
        <KubeObjectMeta object={volumeClaim}/>
        <DrawerItem name="Access Modes">
          {accessModes.join(", ")}
        </DrawerItem>
        <DrawerItem name="Storage Class Name">
          {storageClassName}
        </DrawerItem>
        <DrawerItem name="Storage">
          {volumeClaim.getStorage()}
        </DrawerItem>
        <DrawerItem name="Pods" className="pods">
          {pods.map(pod => (
            <Link key={pod.getId()} to={getDetailsUrl(pod.selfLink)}>
              {pod.getName()}
            </Link>
          ))}
        </DrawerItem>
        <DrawerItem name="Status">
          {volumeClaim.getStatus()}
        </DrawerItem>

        <DrawerTitle title="Selector"/>

        <DrawerItem name="Match Labels" labelsOnly>
          {volumeClaim.getMatchLabels().map(label => <Badge key={label} label={label}/>)}
        </DrawerItem>

        <DrawerItem name="Match Expressions">
          {volumeClaim.getMatchExpressions().map(({ key, operator, values }, i) => (
            <Fragment key={i}>
              <DrawerItem name="Key">{key}</DrawerItem>
              <DrawerItem name="Operator">{operator}</DrawerItem>
              <DrawerItem name="Values">{values.join(", ")}</DrawerItem>
            </Fragment>
          ))}
        </DrawerItem>
      </div>
    );
  }
}
