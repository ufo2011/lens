import "./bottom-bar.scss";

import React from "react";
import { observer } from "mobx-react";
import { Icon } from "../icon";
import { WorkspaceStore } from "../../../common/workspace-store";
import { StatusBarRegistration, statusBarRegistry } from "../../../extensions/registries";
import { CommandOverlay } from "../command-palette/command-container";
import { ChooseWorkspace } from "../+workspaces";

@observer
export class BottomBar extends React.Component {
  renderRegisteredItem(registration: StatusBarRegistration) {
    const { item } = registration;

    if (item) {
      return typeof item === "function" ? item() : item;
    }

    return <registration.components.Item />;
  }

  renderRegisteredItems(items: StatusBarRegistration[]) {
    return (
      <div className="extensions box grow flex gaps justify-flex-end">
        {
          items
            .filter(registration => registration?.item || registration?.components?.Item)
            .map((registration, index) => (
              <div className="flex align-center gaps item" key={index}>
                {this.renderRegisteredItem(registration)}
              </div>
            ))
        }
      </div>
    );
  }

  render() {
    const { currentWorkspace } = WorkspaceStore.getInstance();
    // in case .getItems() returns undefined
    const items = statusBarRegistry.getItems() ?? [];

    return (
      <div className="BottomBar flex gaps">
        <div id="current-workspace" data-test-id="current-workspace" className="flex gaps align-center" onClick={() => CommandOverlay.open(<ChooseWorkspace />)}>
          <Icon smallest material="layers"/>
          <span className="workspace-name" data-test-id="current-workspace-name">{currentWorkspace.name}</span>
        </div>
        {this.renderRegisteredItems(items)}
      </div>
    );
  }
}
