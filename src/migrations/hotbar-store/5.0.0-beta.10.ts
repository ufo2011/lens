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

import { app } from "electron";
import fse from "fs-extra";
import { isNull } from "lodash";
import path from "path";
import * as uuid from "uuid";
import type { ClusterStoreModel } from "../../common/cluster-store";
import { defaultHotbarCells, Hotbar, HotbarStore } from "../../common/hotbar-store";
import { catalogEntity } from "../../main/catalog-sources/general";
import { MigrationDeclaration, migrationLog } from "../helpers";
import { generateNewIdFor } from "../utils";

interface Pre500WorkspaceStoreModel {
  workspaces: {
    id: string;
    name: string;
  }[];
}

export default {
  version: "5.0.0-beta.10",
  run(store) {
    const hotbars: Hotbar[] = store.get("hotbars");
    const userDataPath = app.getPath("userData");

    try {
      const workspaceStoreData: Pre500WorkspaceStoreModel = fse.readJsonSync(path.join(userDataPath, "lens-workspace-store.json"));
      const { clusters }: ClusterStoreModel = fse.readJSONSync(path.join(userDataPath, "lens-cluster-store.json"));
      const workspaceHotbars = new Map<string, Hotbar>(); // mapping from WorkspaceId to HotBar

      for (const { id, name } of workspaceStoreData.workspaces) {
        migrationLog(`Creating new hotbar for ${name}`);
        workspaceHotbars.set(id, {
          id: uuid.v4(), // don't use the old IDs as they aren't necessarily UUIDs
          items: [],
          name: `Workspace: ${name}`,
        });
      }

      {
        // grab the default named hotbar or the first.
        const defaultHotbarIndex = Math.max(0, hotbars.findIndex(hotbar => hotbar.name === "default"));
        const [{ name, id, items }] = hotbars.splice(defaultHotbarIndex, 1);

        workspaceHotbars.set("default", {
          name,
          id,
          items: items.filter(Boolean),
        });
      }

      for (const cluster of clusters) {
        const uid = generateNewIdFor(cluster);

        for (const workspaceId of cluster.workspaces ?? [cluster.workspace].filter(Boolean)) {
          const workspaceHotbar = workspaceHotbars.get(workspaceId);

          if (!workspaceHotbar) {
            migrationLog(`Cluster ${uid} has unknown workspace ID, skipping`);
            continue;
          }

          migrationLog(`Adding cluster ${uid} to ${workspaceHotbar.name}`);

          if (workspaceHotbar?.items.length < defaultHotbarCells) {
            workspaceHotbar.items.push({
              entity: {
                uid: generateNewIdFor(cluster),
                name: cluster.preferences.clusterName || cluster.contextName,
              }
            });
          }
        }
      }

      for (const hotbar of workspaceHotbars.values()) {
        if (hotbar.items.length === 0) {
          migrationLog(`Skipping ${hotbar.name} due to it being empty`);
          continue;
        }

        while (hotbar.items.length < defaultHotbarCells) {
          hotbar.items.push(null);
        }

        hotbars.push(hotbar);
      }

      /**
       * Finally, make sure that the catalog entity hotbar item is in place.
       * Just in case something else removed it.
       *
       * if every hotbar has elements that all not the `catalog-entity` item
       */
      if (hotbars.every(hotbar => hotbar.items.every(item => item?.entity?.uid !== "catalog-entity"))) {
        // note, we will add a new whole hotbar here called "default" if that was previously removed
        const defaultHotbar = hotbars.find(hotbar => hotbar.name === "default");
        const { metadata: { uid, name, source } } = catalogEntity;

        if (defaultHotbar) {
          const freeIndex = defaultHotbar.items.findIndex(isNull);

          if (freeIndex === -1) {
            // making a new hotbar is less destructive if the first hotbar
            // called "default" is full than overriding a hotbar item
            const hotbar = {
              id: uuid.v4(),
              name: "initial",
              items: HotbarStore.getInitialItems(),
            };

            hotbar.items[0] = { entity: { uid, name, source } };
            hotbars.unshift(hotbar);
          } else {
            defaultHotbar.items[freeIndex] = { entity: { uid, name, source } };
          }
        } else {
          const hotbar = {
            id: uuid.v4(),
            name: "default",
            items: HotbarStore.getInitialItems(),
          };

          hotbar.items[0] = { entity: { uid, name, source } };
          hotbars.unshift(hotbar);
        }
      }

      store.set("hotbars", hotbars);
    } catch (error) {
      // ignore files being missing
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }
} as MigrationDeclaration;
