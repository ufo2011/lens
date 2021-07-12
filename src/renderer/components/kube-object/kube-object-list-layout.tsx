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
import { computed, makeObservable } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { cssNames } from "../../utils";
import type { KubeObject } from "../../api/kube-object";
import { ItemListLayout, ItemListLayoutProps } from "../item-object-list/item-list-layout";
import type { KubeObjectStore } from "../../kube-object.store";
import { KubeObjectMenu } from "./kube-object-menu";
import { kubeSelectedUrlParam, showDetails } from "./kube-object-details";
import { kubeWatchApi } from "../../api/kube-watch-api";
import { clusterContext } from "../context";
import { NamespaceSelectFilter } from "../+namespaces/namespace-select-filter";
import { ResourceKindMap, ResourceNames } from "../../utils/rbac";

export interface KubeObjectListLayoutProps extends ItemListLayoutProps {
  store: KubeObjectStore;
  dependentStores?: KubeObjectStore[];
}

const defaultProps: Partial<KubeObjectListLayoutProps> = {
  onDetails: (item: KubeObject) => showDetails(item.selfLink),
};

@observer
export class KubeObjectListLayout extends React.Component<KubeObjectListLayoutProps> {
  static defaultProps = defaultProps as object;

  constructor(props: KubeObjectListLayoutProps) {
    super(props);
    makeObservable(this);
  }

  @computed get selectedItem() {
    return this.props.store.getByPath(kubeSelectedUrlParam.get());
  }

  componentDidMount() {
    const { store, dependentStores = [] } = this.props;
    const stores = Array.from(new Set([store, ...dependentStores]));

    disposeOnUnmount(this, [
      kubeWatchApi.subscribeStores(stores, {
        preload: true,
        namespaces: clusterContext.contextNamespaces,
      })
    ]);
  }

  render() {
    const { className, customizeHeader, store, items = store.contextItems, ...layoutProps } = this.props;
    const placeholderString = ResourceNames[ResourceKindMap[store.api.kind]] || store.api.kind;

    return (
      <ItemListLayout
        {...layoutProps}
        className={cssNames("KubeObjectListLayout", className)}
        store={store}
        items={items}
        preloadStores={false} // loading handled in kubeWatchApi.subscribeStores()
        detailsItem={this.selectedItem}
        customizeHeader={[
          ({ filters, searchProps, ...headerPlaceHolders }) => ({
            filters: (
              <>
                {filters}
                {store.api.isNamespaced && <NamespaceSelectFilter />}
              </>
            ),
            searchProps: {
              ...searchProps,
              placeholder: `Search ${placeholderString}...`,
            },
            ...headerPlaceHolders,
          }),
          ...[customizeHeader].flat(),
        ]}
        renderItemMenu={(item: KubeObject) => <KubeObjectMenu object={item} />} // safe because we are dealing with KubeObjects here
      />
    );
  }
}
