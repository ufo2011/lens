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

import countBy from "lodash/countBy";
import { action, observable, makeObservable } from "mobx";
import { KubeObjectStore } from "../../kube-object.store";
import { autoBind, cpuUnitsToNumber, unitsToBytes } from "../../utils";
import { IPodMetrics, Pod, PodMetrics, podMetricsApi, podsApi } from "../../api/endpoints";
import { apiManager } from "../../api/api-manager";
import type { WorkloadKubeObject } from "../../api/workload-kube-object";

export class PodsStore extends KubeObjectStore<Pod> {
  api = podsApi;

  @observable metrics: IPodMetrics = null;
  @observable kubeMetrics = observable.array<PodMetrics>([]);

  constructor() {
    super();

    makeObservable(this);
    autoBind(this);
  }

  @action
  async loadMetrics(pod: Pod) {
    this.metrics = await podsApi.getMetrics([pod], pod.getNs());
  }

  loadContainerMetrics(pod: Pod) {
    return podsApi.getMetrics([pod], pod.getNs(), "container, namespace");
  }

  async loadKubeMetrics(namespace?: string) {
    try {
      const metrics = await podMetricsApi.list({ namespace });

      this.kubeMetrics.replace(metrics);
    } catch (error) {
      console.error("loadKubeMetrics failed", error);
    }
  }

  getPodsByOwner(workload: WorkloadKubeObject): Pod[] {
    if (!workload) return [];

    return this.items.filter(pod => {
      const owners = pod.getOwnerRefs();

      return owners.find(owner => owner.uid === workload.getId());
    });
  }

  getPodsByOwnerId(workloadId: string): Pod[] {
    return this.items.filter(pod => {
      return pod.getOwnerRefs().find(owner => owner.uid === workloadId);
    });
  }

  getPodsByNode(node: string) {
    if (!this.isLoaded) return [];

    return this.items.filter(pod => pod.spec.nodeName === node);
  }

  getStatuses(pods: Pod[]) {
    return countBy(pods.map(pod => pod.getStatus()));
  }

  getPodKubeMetrics(pod: Pod) {
    const containers = pod.getContainers();
    const empty = { cpu: 0, memory: 0 };
    const metrics = this.kubeMetrics.find(metric => {
      return [
        metric.getName() === pod.getName(),
        metric.getNs() === pod.getNs()
      ].every(v => v);
    });

    if (!metrics) return empty;

    return containers.reduce((total, container) => {
      const metric = metrics.containers.find(item => item.name == container.name);
      let cpu = "0";
      let memory = "0";

      if (metric && metric.usage) {
        cpu = metric.usage.cpu || "0";
        memory = metric.usage.memory || "0";
      }

      return {
        cpu: total.cpu + cpuUnitsToNumber(cpu),
        memory: total.memory + unitsToBytes(memory)
      };
    }, empty);
  }

  reset() {
    this.metrics = null;
  }
}

export const podsStore = new PodsStore();
apiManager.registerStore(podsStore);
