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

import { observable, makeObservable } from "mobx";
import { autoBind } from "../../utils";
import { KubeObjectStore } from "../../kube-object.store";
import { IPodMetrics, podsApi, PodStatus, StatefulSet, statefulSetApi } from "../../api/endpoints";
import { podsStore } from "../+workloads-pods/pods.store";
import { apiManager } from "../../api/api-manager";

export class StatefulSetStore extends KubeObjectStore<StatefulSet> {
  api = statefulSetApi;
  @observable metrics: IPodMetrics = null;

  constructor() {
    super();

    makeObservable(this);
    autoBind(this);
  }


  async loadMetrics(statefulSet: StatefulSet) {
    const pods = this.getChildPods(statefulSet);

    this.metrics = await podsApi.getMetrics(pods, statefulSet.getNs(), "");
  }

  getChildPods(statefulSet: StatefulSet) {
    return podsStore.getPodsByOwnerId(statefulSet.getId());
  }

  getStatuses(statefulSets: StatefulSet[]) {
    const status = { failed: 0, pending: 0, running: 0 };

    statefulSets.forEach(statefulSet => {
      const pods = this.getChildPods(statefulSet);

      if (pods.some(pod => pod.getStatus() === PodStatus.FAILED)) {
        status.failed++;
      }
      else if (pods.some(pod => pod.getStatus() === PodStatus.PENDING)) {
        status.pending++;
      }
      else {
        status.running++;
      }
    });

    return status;
  }

  reset() {
    this.metrics = null;
  }
}

export const statefulSetStore = new StatefulSetStore();
apiManager.registerStore(statefulSetStore);
