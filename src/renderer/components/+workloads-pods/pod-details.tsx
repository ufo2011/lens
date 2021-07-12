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

import "./pod-details.scss";

import React from "react";
import kebabCase from "lodash/kebabCase";
import { disposeOnUnmount, observer } from "mobx-react";
import { Link } from "react-router-dom";
import { autorun, observable, reaction, makeObservable } from "mobx";
import { IPodMetrics, nodesApi, Pod, pvcApi, configMapApi } from "../../api/endpoints";
import { DrawerItem, DrawerTitle } from "../drawer";
import { Badge } from "../badge";
import { boundMethod, cssNames, interval, toJS } from "../../utils";
import { PodDetailsContainer } from "./pod-details-container";
import { PodDetailsAffinities } from "./pod-details-affinities";
import { PodDetailsTolerations } from "./pod-details-tolerations";
import { Icon } from "../icon";
import { PodDetailsSecrets } from "./pod-details-secrets";
import { ResourceMetrics } from "../resource-metrics";
import { podsStore } from "./pods.store";
import { getDetailsUrl, KubeObjectDetailsProps } from "../kube-object";
import { getItemMetrics } from "../../api/endpoints/metrics.api";
import { PodCharts, podMetricTabs } from "./pod-charts";
import { KubeObjectMeta } from "../kube-object/kube-object-meta";
import { getActiveClusterEntity } from "../../api/catalog-entity-registry";
import { ClusterMetricsResourceType } from "../../../main/cluster";

interface Props extends KubeObjectDetailsProps<Pod> {
}

@observer
export class PodDetails extends React.Component<Props> {
  @observable containerMetrics: IPodMetrics;

  private watcher = interval(60, () => this.loadMetrics());

  constructor(props: Props) {
    super(props);
    makeObservable(this);
  }

  componentDidMount() {
    disposeOnUnmount(this, [
      autorun(() => {
        this.containerMetrics = null;
        this.loadMetrics();
      }),
      reaction(() => this.props.object, () => {
        podsStore.reset();
      })
    ]);
    this.watcher.start();
  }

  componentWillUnmount() {
    podsStore.reset();
  }

  @boundMethod
  async loadMetrics() {
    const { object: pod } = this.props;

    this.containerMetrics = await podsStore.loadContainerMetrics(pod);
  }

  render() {
    const { object: pod } = this.props;

    if (!pod) return null;
    const { status, spec } = pod;
    const { conditions, podIP } = status;
    const podIPs = pod.getIPs();
    const { nodeName } = spec;
    const nodeSelector = pod.getNodeSelectors();
    const volumes = pod.getVolumes();
    const metrics = podsStore.metrics;
    const isMetricHidden = getActiveClusterEntity()?.isMetricHidden(ClusterMetricsResourceType.Pod);

    return (
      <div className="PodDetails">
        {!isMetricHidden && (
          <ResourceMetrics
            loader={() => podsStore.loadMetrics(pod)}
            tabs={podMetricTabs} object={pod} params={{ metrics }}
          >
            <PodCharts/>
          </ResourceMetrics>
        )}
        <KubeObjectMeta object={pod}/>
        <DrawerItem name="Status">
          <span className={cssNames("status", kebabCase(pod.getStatusMessage()))}>{pod.getStatusMessage()}</span>
        </DrawerItem>
        <DrawerItem name="Node">
          {nodeName && (
            <Link to={getDetailsUrl(nodesApi.getUrl({ name: nodeName }))}>
              {nodeName}
            </Link>
          )}
        </DrawerItem>
        <DrawerItem name="Pod IP">
          {podIP}
        </DrawerItem>
        <DrawerItem name="Pod IPs" hidden={!podIPs.length} labelsOnly>
          {
            podIPs.map(label => (
              <Badge key={label} label={label}/>
            ))
          }
        </DrawerItem>
        <DrawerItem name="Priority Class">
          {pod.getPriorityClassName()}
        </DrawerItem>
        <DrawerItem name="QoS Class">
          {pod.getQosClass()}
        </DrawerItem>
        {conditions &&
        <DrawerItem name="Conditions" className="conditions" labelsOnly>
          {
            conditions.map(condition => {
              const { type, status, lastTransitionTime } = condition;

              return (
                <Badge
                  key={type}
                  label={type}
                  className={cssNames({ disabled: status === "False" })}
                  tooltip={`Last transition time: ${lastTransitionTime}`}
                />
              );
            })
          }
        </DrawerItem>
        }
        {nodeSelector.length > 0 &&
        <DrawerItem name="Node Selector">
          {
            nodeSelector.map(label => (
              <Badge key={label} label={label}/>
            ))
          }
        </DrawerItem>
        }
        <PodDetailsTolerations workload={pod}/>
        <PodDetailsAffinities workload={pod}/>

        {pod.getSecrets().length > 0 && (
          <DrawerItem name="Secrets">
            <PodDetailsSecrets pod={pod}/>
          </DrawerItem>
        )}

        {pod.getInitContainers() && pod.getInitContainers().length > 0 &&
        <DrawerTitle title="Init Containers"/>
        }
        {
          pod.getInitContainers() && pod.getInitContainers().map(container => {
            return <PodDetailsContainer key={container.name} pod={pod} container={container}/>;
          })
        }
        <DrawerTitle title="Containers"/>
        {
          pod.getContainers().map(container => {
            const { name } = container;
            const metrics = getItemMetrics(toJS(this.containerMetrics), name);

            return (
              <PodDetailsContainer
                key={name}
                pod={pod}
                container={container}
                metrics={metrics || null}
              />
            );
          })
        }

        {volumes.length > 0 && (
          <>
            <DrawerTitle title="Volumes"/>
            {volumes.map(volume => {
              const claimName = volume.persistentVolumeClaim ? volume.persistentVolumeClaim.claimName : null;
              const configMap = volume.configMap ? volume.configMap.name : null;
              const type = Object.keys(volume)[1];

              return (
                <div key={volume.name} className="volume">
                  <div className="title flex gaps">
                    <Icon small material="storage"/>
                    <span>{volume.name}</span>
                  </div>
                  <DrawerItem name="Type">
                    {type}
                  </DrawerItem>
                  { type == "configMap" && (
                    <div>
                      {configMap && (
                        <DrawerItem name="Name">
                          <Link
                            to={getDetailsUrl(configMapApi.getUrl({
                              name: configMap,
                              namespace: pod.getNs(),
                            }))}>{configMap}
                          </Link>
                        </DrawerItem>
                      )}
                    </div>
                  )}
                  { type === "emptyDir" && (
                    <div>
                      { volume.emptyDir.medium && (
                        <DrawerItem name="Medium">
                          {volume.emptyDir.medium}
                        </DrawerItem>
                      )}
                      { volume.emptyDir.sizeLimit && (
                        <DrawerItem name="Size Limit">
                          {volume.emptyDir.sizeLimit}
                        </DrawerItem>
                      )}
                    </div>
                  )}

                  {claimName && (
                    <DrawerItem name="Claim Name">
                      <Link
                        to={getDetailsUrl(pvcApi.getUrl({
                          name: claimName,
                          namespace: pod.getNs(),
                        }))}
                      >{claimName}
                      </Link>
                    </DrawerItem>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }
}
