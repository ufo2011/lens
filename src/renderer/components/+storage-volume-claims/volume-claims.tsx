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

import "./volume-claims.scss";

import React from "react";
import { observer } from "mobx-react";
import { Link, RouteComponentProps } from "react-router-dom";
import { volumeClaimStore } from "./volume-claim.store";
import type { PersistentVolumeClaim } from "../../api/endpoints/persistent-volume-claims.api";
import { podsStore } from "../+workloads-pods/pods.store";
import { getDetailsUrl, KubeObjectListLayout } from "../kube-object";
import { unitsToBytes } from "../../utils/convertMemory";
import { stopPropagation } from "../../utils";
import { storageClassApi } from "../../api/endpoints";
import { KubeObjectStatusIcon } from "../kube-object-status-icon";
import type { VolumeClaimsRouteParams } from "../../../common/routes";

enum columnId {
  name = "name",
  namespace = "namespace",
  pods = "pods",
  size = "size",
  storageClass = "storage-class",
  status = "status",
  age = "age",
}

interface Props extends RouteComponentProps<VolumeClaimsRouteParams> {
}

@observer
export class PersistentVolumeClaims extends React.Component<Props> {
  render() {
    return (
      <KubeObjectListLayout
        isConfigurable
        tableId="storage_volume_claims"
        className="PersistentVolumeClaims"
        store={volumeClaimStore}
        dependentStores={[podsStore]}
        sortingCallbacks={{
          [columnId.name]: (pvc: PersistentVolumeClaim) => pvc.getName(),
          [columnId.namespace]: (pvc: PersistentVolumeClaim) => pvc.getNs(),
          [columnId.pods]: (pvc: PersistentVolumeClaim) => pvc.getPods(podsStore.items).map(pod => pod.getName()),
          [columnId.status]: (pvc: PersistentVolumeClaim) => pvc.getStatus(),
          [columnId.size]: (pvc: PersistentVolumeClaim) => unitsToBytes(pvc.getStorage()),
          [columnId.storageClass]: (pvc: PersistentVolumeClaim) => pvc.spec.storageClassName,
          [columnId.age]: (pvc: PersistentVolumeClaim) => pvc.getTimeDiffFromNow(),
        }}
        searchFilters={[
          (item: PersistentVolumeClaim) => item.getSearchFields(),
          (item: PersistentVolumeClaim) => item.getPods(podsStore.items).map(pod => pod.getName()),
        ]}
        renderHeaderTitle="Persistent Volume Claims"
        renderTableHeader={[
          { title: "Name", className: "name", sortBy: columnId.name, id: columnId.name },
          { className: "warning", showWithColumn: columnId.name },
          { title: "Namespace", className: "namespace", sortBy: columnId.namespace, id: columnId.namespace },
          { title: "Storage class", className: "storageClass", sortBy: columnId.storageClass, id: columnId.storageClass },
          { title: "Size", className: "size", sortBy: columnId.size, id: columnId.size },
          { title: "Pods", className: "pods", sortBy: columnId.pods, id: columnId.pods },
          { title: "Age", className: "age", sortBy: columnId.age, id: columnId.age },
          { title: "Status", className: "status", sortBy: columnId.status, id: columnId.status },
        ]}
        renderTableContents={(pvc: PersistentVolumeClaim) => {
          const pods = pvc.getPods(podsStore.items);
          const { storageClassName } = pvc.spec;
          const storageClassDetailsUrl = getDetailsUrl(storageClassApi.getUrl({
            name: storageClassName
          }));

          return [
            pvc.getName(),
            <KubeObjectStatusIcon key="icon" object={pvc} />,
            pvc.getNs(),
            <Link key="link" to={storageClassDetailsUrl} onClick={stopPropagation}>
              {storageClassName}
            </Link>,
            pvc.getStorage(),
            pods.map(pod => (
              <Link key={pod.getId()} to={getDetailsUrl(pod.selfLink)} onClick={stopPropagation}>
                {pod.getName()}
              </Link>
            )),
            pvc.getAge(),
            { title: pvc.getStatus(), className: pvc.getStatus().toLowerCase() },
          ];
        }}
      />
    );
  }
}
