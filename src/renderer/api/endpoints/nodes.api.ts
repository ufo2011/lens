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

import { KubeObject } from "../kube-object";
import { autoBind, cpuUnitsToNumber, unitsToBytes } from "../../utils";
import { IMetrics, metricsApi } from "./metrics.api";
import { KubeApi } from "../kube-api";
import type { KubeJsonApiData } from "../kube-json-api";

export class NodesApi extends KubeApi<Node> {
  getMetrics(): Promise<INodeMetrics> {
    const opts = { category: "nodes" };

    return metricsApi.getMetrics({
      memoryUsage: opts,
      workloadMemoryUsage: opts,
      memoryCapacity: opts,
      memoryAllocatableCapacity: opts,
      cpuUsage: opts,
      cpuCapacity: opts,
      fsSize: opts,
      fsUsage: opts
    });
  }
}

export interface INodeMetrics<T = IMetrics> {
  [metric: string]: T;
  memoryUsage: T;
  workloadMemoryUsage: T;
  memoryCapacity: T;
  memoryAllocatableCapacity: T;
  cpuUsage: T;
  cpuCapacity: T;
  fsUsage: T;
  fsSize: T;
}

export interface Node {
  spec: {
    podCIDR?: string;
    podCIDRs?: string[];
    providerID?: string;
    /**
     * @deprecated see https://issues.k8s.io/61966
     */
    externalID?: string;
    taints?: {
      key: string;
      value: string;
      effect: string;
      timeAdded: string;
    }[];
    unschedulable?: boolean;
  };
  status: {
    capacity?: {
      cpu: string;
      ["ephemeral-storage"]: string;
      ["hugepages-1Gi"]: string;
      ["hugepages-2Mi"]: string;
      memory: string;
      pods: string;
    };
    allocatable?: {
      cpu: string;
      ["ephemeral-storage"]: string;
      ["hugepages-1Gi"]: string;
      ["hugepages-2Mi"]: string;
      memory: string;
      pods: string;
    };
    conditions?: {
      type: string;
      status: string;
      lastHeartbeatTime?: string;
      lastTransitionTime?: string;
      reason?: string;
      message?: string;
    }[];
    addresses?: {
      type: string;
      address: string;
    }[];
    daemonEndpoints?: {
      kubeletEndpoint: {
        Port: number; //it must be uppercase for backwards compatibility
      }
    }
    nodeInfo?: {
      machineID: string;
      systemUUID: string;
      bootID: string;
      kernelVersion: string;
      osImage: string;
      containerRuntimeVersion: string;
      kubeletVersion: string;
      kubeProxyVersion: string;
      operatingSystem: string;
      architecture: string;
    };
    images?: {
      names: string[];
      sizeBytes?: number;
    }[];
    volumesInUse?: string[];
    volumesAttached?: {
      name: string;
      devicePath: string;
    }[];
  };
}

export class Node extends KubeObject {
  static kind = "Node";
  static namespaced = false;
  static apiBase = "/api/v1/nodes";

  constructor(data: KubeJsonApiData) {
    super(data);
    autoBind(this);
  }

  getNodeConditionText() {
    const { conditions } = this.status;

    if (!conditions) return "";

    return conditions.reduce((types, current) => {
      if (current.status !== "True") return "";

      return types += ` ${current.type}`;
    }, "");
  }

  getTaints() {
    return this.spec.taints || [];
  }

  getRoleLabels() {
    const roleLabels = Object.keys(this.metadata.labels).filter(key =>
      key.includes("node-role.kubernetes.io")
    ).map(key => key.match(/([^/]+$)/)[0]); // all after last slash

    if (this.metadata.labels["kubernetes.io/role"] != undefined) {
      roleLabels.push(this.metadata.labels["kubernetes.io/role"]);
    }

    return roleLabels.join(", ");
  }

  getCpuCapacity() {
    if (!this.status.capacity || !this.status.capacity.cpu) return 0;

    return cpuUnitsToNumber(this.status.capacity.cpu);
  }

  getMemoryCapacity() {
    if (!this.status.capacity || !this.status.capacity.memory) return 0;

    return unitsToBytes(this.status.capacity.memory);
  }

  getConditions() {
    const conditions = this.status.conditions || [];

    if (this.isUnschedulable()) {
      return [{ type: "SchedulingDisabled", status: "True" }, ...conditions];
    }

    return conditions;
  }

  getActiveConditions() {
    return this.getConditions().filter(c => c.status === "True");
  }

  getWarningConditions() {
    const goodConditions = ["Ready", "HostUpgrades", "SchedulingDisabled"];

    return this.getActiveConditions().filter(condition => {
      return !goodConditions.includes(condition.type);
    });
  }

  getKubeletVersion() {
    return this.status.nodeInfo.kubeletVersion;
  }

  getOperatingSystem(): string {
    const label = this.getLabels().find(label => label.startsWith("kubernetes.io/os="));

    if (label) {
      return label.split("=", 2)[1];
    }

    return "linux";
  }

  isUnschedulable() {
    return this.spec.unschedulable;
  }
}

export const nodesApi = new NodesApi({
  objectConstructor: Node,
});
