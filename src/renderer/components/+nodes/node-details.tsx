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

import "./node-details.scss";

import React from "react";
import upperFirst from "lodash/upperFirst";
import kebabCase from "lodash/kebabCase";
import { disposeOnUnmount, observer } from "mobx-react";
import { DrawerItem, DrawerItemLabels } from "../drawer";
import { Badge } from "../badge";
import { nodesStore } from "./nodes.store";
import { ResourceMetrics } from "../resource-metrics";
import { podsStore } from "../+workloads-pods/pods.store";
import type { KubeObjectDetailsProps } from "../kube-object";
import type { Node } from "../../api/endpoints";
import { NodeCharts } from "./node-charts";
import { reaction } from "mobx";
import { PodDetailsList } from "../+workloads-pods/pod-details-list";
import { KubeObjectMeta } from "../kube-object/kube-object-meta";
import { getActiveClusterEntity } from "../../api/catalog-entity-registry";
import { ClusterMetricsResourceType } from "../../../main/cluster";
import { NodeDetailsResources } from "./node-details-resources";
import { DrawerTitle } from "../drawer/drawer-title";

interface Props extends KubeObjectDetailsProps<Node> {
}

@observer
export class NodeDetails extends React.Component<Props> {
  @disposeOnUnmount
  clean = reaction(() => this.props.object.getName(), () => {
    nodesStore.nodeMetrics = null;
  });

  async componentDidMount() {
    podsStore.reloadAll();
  }

  componentWillUnmount() {
    nodesStore.nodeMetrics = null;
  }

  render() {
    const { object: node } = this.props;

    if (!node) return null;
    const { status } = node;
    const { nodeInfo, addresses } = status;
    const conditions = node.getActiveConditions();
    const taints = node.getTaints();
    const childPods = podsStore.getPodsByNode(node.getName());
    const metrics = nodesStore.nodeMetrics;
    const metricTabs = [
      "CPU",
      "Memory",
      "Disk",
      "Pods",
    ];
    const isMetricHidden = getActiveClusterEntity()?.isMetricHidden(ClusterMetricsResourceType.Node);

    return (
      <div className="NodeDetails">
        {!isMetricHidden && podsStore.isLoaded && (
          <ResourceMetrics
            loader={() => nodesStore.loadMetrics(node.getName())}
            tabs={metricTabs} object={node} params={{ metrics }}
          >
            <NodeCharts/>
          </ResourceMetrics>
        )}
        <KubeObjectMeta object={node} hideFields={["labels", "annotations", "uid", "resourceVersion", "selfLink"]}/>
        {addresses &&
        <DrawerItem name="Addresses">
          {
            addresses.map(({ type, address }) => (
              <p key={type}>{type}: {address}</p>
            ))
          }
        </DrawerItem>
        }
        <DrawerItem name="OS">
          {nodeInfo.operatingSystem} ({nodeInfo.architecture})
        </DrawerItem>
        <DrawerItem name="OS Image">
          {nodeInfo.osImage}
        </DrawerItem>
        <DrawerItem name="Kernel version">
          {nodeInfo.kernelVersion}
        </DrawerItem>
        <DrawerItem name="Container runtime">
          {nodeInfo.containerRuntimeVersion}
        </DrawerItem>
        <DrawerItem name="Kubelet version">
          {nodeInfo.kubeletVersion}
        </DrawerItem>
        <DrawerItemLabels
          name="Labels"
          labels={node.getLabels()}
        />
        <DrawerItemLabels
          name="Annotations"
          labels={node.getAnnotations()}
        />
        {taints.length > 0 && (
          <DrawerItem name="Taints" labelsOnly>
            {
              taints.map(({ key, effect, value }) => (
                <Badge key={key} label={`${key}: ${effect}`} tooltip={value}/>
              ))
            }
          </DrawerItem>
        )}
        {conditions &&
        <DrawerItem name="Conditions" className="conditions" labelsOnly>
          {
            conditions.map(condition => {
              const { type } = condition;

              return (
                <Badge
                  key={type}
                  label={type}
                  className={kebabCase(type)}
                  tooltip={{
                    formatters: {
                      tableView: true,
                    },
                    children: Object.entries(condition).map(([key, value]) =>
                      <div key={key} className="flex gaps align-center">
                        <div className="name">{upperFirst(key)}</div>
                        <div className="value">{value}</div>
                      </div>
                    )
                  }}
                />
              );
            })
          }
        </DrawerItem>
        }
        <DrawerTitle title="Capacity"/>
        <NodeDetailsResources node={node} type={"capacity"}/>
        <DrawerTitle title="Allocatable"/>
        <NodeDetailsResources node={node} type={"allocatable"}/>
        <PodDetailsList
          pods={childPods}
          owner={node}
          maxCpu={node.getCpuCapacity()}
          maxMemory={node.getMemoryCapacity()}
        />
      </div>
    );
  }
}
