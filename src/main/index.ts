// Main process

import "../common/system-ca";
import "../common/prometheus-providers";
import * as Mobx from "mobx";
import * as LensExtensions from "../extensions/core-api";
import { app, autoUpdater, dialog, powerMonitor } from "electron";
import { appName } from "../common/vars";
import path from "path";
import { LensProxy } from "./lens-proxy";
import { WindowManager } from "./window-manager";
import { ClusterManager } from "./cluster-manager";
import { shellSync } from "./shell-sync";
import { getFreePort } from "./port";
import { mangleProxyEnv } from "./proxy-env";
import { registerFileProtocol } from "../common/register-protocol";
import logger from "./logger";
import { ClusterStore } from "../common/cluster-store";
import { UserStore } from "../common/user-store";
import { WorkspaceStore } from "../common/workspace-store";
import { appEventBus } from "../common/event-bus";
import { ExtensionLoader } from "../extensions/extension-loader";
import { ExtensionsStore } from "../extensions/extensions-store";
import { InstalledExtension, ExtensionDiscovery } from "../extensions/extension-discovery";
import type { LensExtensionId } from "../extensions/lens-extension";
import { FilesystemProvisionerStore } from "./extension-filesystem";
import { installDeveloperTools } from "./developer-tools";
import { bindBroadcastHandlers } from "../common/ipc";
import { getAppVersion, getAppVersionFromProxyServer } from "../common/utils";
import { startUpdateChecking } from "./app-updater";

const workingDir = path.join(app.getPath("appData"), appName);

app.setName(appName);

if (!process.env.CICD) {
  app.setPath("userData", workingDir);
}

mangleProxyEnv();

if (app.commandLine.getSwitchValue("proxy-server") !== "") {
  process.env.HTTPS_PROXY = app.commandLine.getSwitchValue("proxy-server");
}

const instanceLock = app.requestSingleInstanceLock();

if (!instanceLock) {
  app.exit();
}

app.on("second-instance", () => {
  WindowManager.getInstance(false)?.ensureMainWindow();
});

if (process.env.LENS_DISABLE_GPU) {
  app.disableHardwareAcceleration();
}

app.on("ready", async () => {
  logger.info(`🚀 Starting Lens from "${workingDir}"`);
  logger.info("🐚 Syncing shell environment");
  await shellSync();

  bindBroadcastHandlers();
  installDeveloperTools();

  powerMonitor.on("shutdown", () => {
    app.exit();
  });

  registerFileProtocol("static", __static);

  const userStore = UserStore.getInstanceOrCreate();
  const clusterStore = ClusterStore.getInstanceOrCreate();
  const workspaceStore = WorkspaceStore.getInstanceOrCreate();
  const extensionsStore = ExtensionsStore.getInstanceOrCreate();
  const filesystemStore = FilesystemProvisionerStore.getInstanceOrCreate();

  logger.info("💾 Loading stores");
  // preload
  await Promise.all([
    userStore.load(),
    clusterStore.load(),
    workspaceStore.load(),
    extensionsStore.load(),
    filesystemStore.load(),
  ]);

  // find free port
  let proxyPort;

  try {
    logger.info("🔑 Getting free port for LensProxy server");
    proxyPort = await getFreePort();
  } catch (error) {
    logger.error(error);
    dialog.showErrorBox("Lens Error", "Could not find a free port for the cluster proxy");
    app.exit();
  }

  // create cluster manager
  ClusterManager.getInstanceOrCreate(proxyPort);

  // run proxy
  try {
    logger.info("🔌 Starting LensProxy");
    // eslint-disable-next-line unused-imports/no-unused-vars-ts
    LensProxy.getInstanceOrCreate(proxyPort).listen();
  } catch (error) {
    logger.error(`Could not start proxy (127.0.0:${proxyPort}): ${error?.message}`);
    dialog.showErrorBox("Lens Error", `Could not start proxy (127.0.0:${proxyPort}): ${error?.message || "unknown error"}`);
    app.exit();
  }

  // test proxy connection
  try {
    logger.info("🔎 Testing LensProxy connection ...");
    const versionFromProxy = await getAppVersionFromProxyServer(proxyPort);

    if (getAppVersion() !== versionFromProxy) {
      logger.error(`Proxy server responded with invalid response`);
    }
    logger.info("⚡ LensProxy connection OK");
  } catch (error) {
    logger.error("Checking proxy server connection failed", error);
  }

  const extensionDiscovery = ExtensionDiscovery.getInstanceOrCreate();

  ExtensionLoader.getInstanceOrCreate().init();
  extensionDiscovery.init();

  logger.info("🖥️  Starting WindowManager");
  WindowManager.getInstanceOrCreate(proxyPort)
    .whenLoaded.then(() => startUpdateChecking());

  logger.info("🧩 Initializing extensions");

  // call after windowManager to see splash earlier
  try {
    const extensions = await extensionDiscovery.load();

    // Start watching after bundled extensions are loaded
    extensionDiscovery.watchExtensions();

    // Subscribe to extensions that are copied or deleted to/from the extensions folder
    extensionDiscovery.events
      .on("add", (extension: InstalledExtension) => {
        ExtensionLoader.getInstance().addExtension(extension);
      })
      .on("remove", (lensExtensionId: LensExtensionId) => {
        ExtensionLoader.getInstance().removeExtension(lensExtensionId);
      });

    ExtensionLoader.getInstance().initExtensions(extensions);
  } catch (error) {
    dialog.showErrorBox("Lens Error", `Could not load extensions${error?.message ? `: ${error.message}` : ""}`);
    console.error(error);
    console.trace();
  }

  setTimeout(() => {
    appEventBus.emit({ name: "service", action: "start" });
  }, 1000);
});

app.on("activate", (event, hasVisibleWindows) => {
  logger.info("APP:ACTIVATE", { hasVisibleWindows });

  if (!hasVisibleWindows) {
    WindowManager.getInstance(false)?.initMainWindow(false);
  }
});

/**
 * This variable should is used so that `autoUpdater.installAndQuit()` works
 */
let blockQuit = true;

autoUpdater.on("before-quit-for-update", () => blockQuit = false);

// Quit app on Cmd+Q (MacOS)
app.on("will-quit", (event) => {
  logger.info("APP:QUIT");
  appEventBus.emit({name: "app", action: "close"});

  ClusterManager.getInstance(false)?.stop(); // close cluster connections

  if (blockQuit) {
    event.preventDefault(); // prevent app's default shutdown (e.g. required for telemetry, etc.)

    return; // skip exit to make tray work, to quit go to app's global menu or tray's menu
  }
});

// Extensions-api runtime exports
export const LensExtensionsApi = {
  ...LensExtensions,
};

export {
  Mobx,
  LensExtensionsApi as LensExtensions,
};
