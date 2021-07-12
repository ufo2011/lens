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

import MD5 from "crypto-js/md5";
import { action, computed, IReactionOptions, makeObservable, observable, reaction } from "mobx";
import { autoBind, createStorage } from "../../utils";
import throttle from "lodash/throttle";

export type TabId = string;

export enum TabKind {
  TERMINAL = "terminal",
  CREATE_RESOURCE = "create-resource",
  EDIT_RESOURCE = "edit-resource",
  INSTALL_CHART = "install-chart",
  UPGRADE_CHART = "upgrade-chart",
  POD_LOGS = "pod-logs",
}

export interface IDockTab {
  id?: TabId;
  kind: TabKind;
  title?: string;
  pinned?: boolean; // not closable
}

export interface DockStorageState {
  height: number;
  tabs: IDockTab[];
  selectedTabId?: TabId;
  isOpen?: boolean;
}

export class DockStore implements DockStorageState {
  constructor() {
    makeObservable(this);
    autoBind(this);
    this.init();
  }

  readonly minHeight = 100;
  @observable fullSize = false;

  private storage = createStorage<DockStorageState>("dock", {
    height: 300,
    tabs: [
      { id: "terminal", kind: TabKind.TERMINAL, title: "Terminal" },
    ],
  });

  get whenReady() {
    return this.storage.whenReady;
  }

  get isOpen(): boolean {
    return this.storage.get().isOpen;
  }

  set isOpen(isOpen: boolean) {
    this.storage.merge({ isOpen });
  }

  get height(): number {
    return this.storage.get().height;
  }

  set height(height: number) {
    this.storage.merge({
      height: Math.max(this.minHeight, Math.min(height || this.minHeight, this.maxHeight)),
    });
  }

  get tabs(): IDockTab[] {
    return this.storage.get().tabs;
  }

  set tabs(tabs: IDockTab[]) {
    this.storage.merge({ tabs });
  }

  get selectedTabId(): TabId | undefined {
    return this.storage.get().selectedTabId || this.tabs[0]?.id;
  }

  set selectedTabId(tabId: TabId) {
    if (tabId && !this.getTabById(tabId)) return; // skip invalid ids

    this.storage.merge({ selectedTabId: tabId });
  }

  @computed get selectedTab() {
    return this.tabs.find(tab => tab.id === this.selectedTabId);
  }

  private init() {
    // adjust terminal height if window size changes
    window.addEventListener("resize", throttle(this.adjustHeight, 250));
  }

  get maxHeight() {
    const mainLayoutHeader = 40;
    const mainLayoutTabs = 33;
    const mainLayoutMargin = 16;
    const dockTabs = 33;
    const preferredMax = window.innerHeight - mainLayoutHeader - mainLayoutTabs - mainLayoutMargin - dockTabs;

    return Math.max(preferredMax, this.minHeight); // don't let max < min
  }

  protected adjustHeight() {
    if (this.height < this.minHeight) this.height = this.minHeight;
    if (this.height > this.maxHeight) this.height = this.maxHeight;
  }

  onResize(callback: () => void, options?: IReactionOptions) {
    return reaction(() => [this.height, this.fullSize], callback, options);
  }

  onTabChange(callback: (tabId: TabId) => void, options?: IReactionOptions) {
    return reaction(() => this.selectedTabId, callback, options);
  }

  hasTabs() {
    return this.tabs.length > 0;
  }

  @action
  open(fullSize?: boolean) {
    this.isOpen = true;

    if (typeof fullSize === "boolean") {
      this.fullSize = fullSize;
    }
  }

  @action
  close() {
    this.isOpen = false;
  }

  @action
  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  @action
  toggleFillSize() {
    if (!this.isOpen) this.open();
    this.fullSize = !this.fullSize;
  }

  getTabById(tabId: TabId) {
    return this.tabs.find(tab => tab.id === tabId);
  }

  getTabIndex(tabId: TabId) {
    return this.tabs.findIndex(tab => tab.id === tabId);
  }

  protected getNewTabNumber(kind: TabKind) {
    const tabNumbers = this.tabs
      .filter(tab => tab.kind === kind)
      .map(tab => {
        const tabNumber = +tab.title.match(/\d+/);

        return tabNumber === 0 ? 1 : tabNumber; // tab without a number is first
      });

    for (let i = 1; ; i++) {
      if (!tabNumbers.includes(i)) return i;
    }
  }

  @action
  createTab(anonTab: IDockTab, addNumber = true): IDockTab {
    const tabId = MD5(Math.random().toString() + Date.now()).toString();
    const tab: IDockTab = { id: tabId, ...anonTab };

    if (addNumber) {
      const tabNumber = this.getNewTabNumber(tab.kind);

      if (tabNumber > 1) tab.title += ` (${tabNumber})`;
    }
    this.tabs.push(tab);
    this.selectTab(tab.id);
    this.open();

    return tab;
  }

  @action
  async closeTab(tabId: TabId) {
    const tab = this.getTabById(tabId);

    if (!tab || tab.pinned) {
      return;
    }
    this.tabs = this.tabs.filter(tab => tab.id !== tabId);

    if (this.selectedTabId === tab.id) {
      if (this.tabs.length) {
        const newTab = this.tabs.slice(-1)[0]; // last

        if (newTab?.kind === TabKind.TERMINAL) {
          // close the dock when selected sibling inactive terminal tab
          const { terminalStore } = await import("./terminal.store");

          if (!terminalStore.isConnected(newTab.id)) this.close();
        }
        this.selectTab(newTab.id);
      } else {
        this.selectedTabId = null;
        this.close();
      }
    }
  }

  closeTabs(tabs: IDockTab[]) {
    tabs.forEach(tab => this.closeTab(tab.id));
  }

  closeAllTabs() {
    this.closeTabs([...this.tabs]);
  }

  closeOtherTabs(tabId: TabId) {
    const index = this.getTabIndex(tabId);
    const tabs = [...this.tabs.slice(0, index), ...this.tabs.slice(index + 1)];

    this.closeTabs(tabs);
  }

  closeTabsToTheRight(tabId: TabId) {
    const index = this.getTabIndex(tabId);
    const tabs = this.tabs.slice(index + 1);

    this.closeTabs(tabs);
  }

  renameTab(tabId: TabId, title: string) {
    const tab = this.getTabById(tabId);

    tab.title = title;
  }

  @action
  selectTab(tabId: TabId) {
    this.selectedTabId = this.getTabById(tabId)?.id ?? null;
  }

  @action
  reset() {
    this.storage?.reset();
  }
}

export const dockStore = new DockStore();
