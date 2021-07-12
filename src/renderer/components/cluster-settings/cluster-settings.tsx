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

import React from "react";
import type { KubernetesCluster } from "../../../common/catalog-entities";
import { ClusterStore } from "../../../common/cluster-store";
import type { EntitySettingViewProps } from "../../../extensions/registries";
import type { CatalogEntity } from "../../api/catalog-entity";
import * as components from "./components";

function getClusterForEntity(entity: CatalogEntity) {
  return ClusterStore.getInstance().getById(entity.metadata.uid);
}

export function GeneralSettings({ entity }: EntitySettingViewProps) {
  const cluster = getClusterForEntity(entity);

  if (!cluster) {
    return null;
  }

  return (
    <section>
      <section>
        <div className="flex">
          <div className="flex-grow pr-8">
            <components.ClusterNameSetting cluster={cluster} />
          </div>
          <div>
            <components.ClusterIconSetting cluster={cluster} entity={entity as KubernetesCluster} />
          </div>
        </div>
      </section>
      <section className="small">
        <components.ClusterKubeconfig cluster={cluster} />
      </section>
    </section>
  );
}

export function ProxySettings({ entity }: EntitySettingViewProps) {
  const cluster = getClusterForEntity(entity);

  if (!cluster) {
    return null;
  }

  return (
    <section>
      <components.ClusterProxySetting cluster={cluster} />
    </section>
  );
}

export function TerminalSettings({ entity }: EntitySettingViewProps) {
  const cluster = getClusterForEntity(entity);

  if (!cluster) {
    return null;
  }

  return (
    <section>
      <components.ClusterHomeDirSetting cluster={cluster} />
    </section>
  );
}

export function NamespacesSettings({ entity }: EntitySettingViewProps) {
  const cluster = getClusterForEntity(entity);

  if (!cluster) {
    return null;
  }

  return (
    <section>
      <components.ClusterAccessibleNamespaces cluster={cluster} />
    </section>
  );
}

export function MetricsSettings({ entity }: EntitySettingViewProps) {
  const cluster = getClusterForEntity(entity);

  if (!cluster) {
    return null;
  }

  return (
    <section>
      <section>
        <components.ClusterPrometheusSetting cluster={cluster} />
      </section>
      <hr/>
      <section>
        <components.ClusterMetricsSetting cluster={cluster} />
        <components.ShowMetricsSetting cluster={cluster} />
      </section>
    </section>
  );
}

export function NodeShellSettings({entity}: EntitySettingViewProps) {
  const cluster = getClusterForEntity(entity);

  if(!cluster) {
    return null;
  }

  return (
    <section>
      <components.ClusterNodeShellSetting cluster={cluster} />
    </section>
  );
}
